## O que você vai conseguir fazer

1. Ver **por cartão** a fatura do mês, o que gastou por categoria, top compras e todas as parcelas ativas (com aviso de "acaba mês que vem").
2. Comparar com o mês anterior pra saber **onde dá pra economizar**.
3. Registrar compra **parcelada em Nx** num clique — o app cria as parcelas certas, respeitando o fechamento.
4. **Pagar a fatura sem duplicar despesa**: pagamento vira transferência conta → cartão, some das despesas, aparece só como quitação.
5. Revisar seu histórico atual e converter pagamentos antigos de fatura que você lançou como despesa (sem apagar nada — você aprova item a item).

## Home nova de "Cartões"

Aba **Finanças → Cartões** deixa de ser só cadastro. Vira:

```text
[ Nubank ●●●● ]  [ Itaú ]  [ + cartão ]
────────────────────────────────────────
Fatura Nov  (fecha 25/nov • vence 05/dez)  ABERTA
R$ 2.340,00   ▓▓▓▓▓░░  68% do limite
             Pago: R$ 0     [ Pagar fatura ]

Onde gastou mais
 Alimentação   R$ 890   38%   ↑ 12% vs out
 Transporte    R$ 420   18%   ↓ 5%
 Assinaturas   R$ 310   13%   =

Parcelas ativas (3)
 iPhone 15     8/12   R$ 450   restam 4
 Sofá         11/12   R$ 180   ACABA MÊS QUE VEM
 Curso         2/6    R$ 220   restam 4

Top 5 do mês
 Mercado Dia 12   R$ 320   Alimentação
 …

[ Ver todos os lançamentos ]  [ Gerenciar cartões ]
```

Período controlado pelo `MonthNavigator` já existente. Cada "mês" = fatura cujo fechamento cai naquele mês.

## Regra anti-duplicação (o ponto crítico)

- **Compra no cartão** = despesa, contabilizada **uma vez**, na data da compra, na categoria escolhida.
- **Pagar fatura** = transferência da conta pro cartão. **Não** entra em despesa, **não** entra em categoria, **não** soma no "Total gasto no mês".
- No Resumo aparece numa linha separada: *"Pagamentos de fatura — R$ X"* (dinheiro que saiu da conta, mas não é gasto novo).
- Na conta bancária a saída aparece normalmente (o dinheiro saiu de verdade).

## Registrar parcelamento

No "Novo lançamento", ao escolher **Despesa + Cartão**:
- Aparece toggle **Parcelar** com nº de parcelas (2–24).
- Ao salvar, gera N linhas com mesma `purchase_group_id`, `installment_no` 1..N.
- Datas das parcelas respeitam o `closing_day`: se comprou depois do fechamento, primeira parcela cai na fatura seguinte.
- Descrição fica `Descrição (k/N)` pra leitura clara no extrato.

## Pagar fatura

Botão **"Pagar fatura"** no card do cartão:
- Já vem preenchido com valor total, cartão e mês da fatura.
- Você escolhe conta de origem e confirma.
- Fatura muda pra **PAGA** (ou "Parcialmente paga" se valor < total).

## Revisar histórico (limpeza dos duplicados atuais)

Nova tela **"Revisar pagamentos de fatura"** acessível pelo cartão:
- Lista despesas candidatas (categoria vazia, descrição com "fatura/cartão/nome-do-banco", ou valor batendo com fatura).
- Cada linha tem botão **"É pagamento de fatura"** → converte a despesa em `card_payment`, vincula ao cartão e mês.
- Nada é apagado ou movido automaticamente. Você decide item a item.

## O que muda no banco

Migração única (não destrutiva):

- `fin_transactions.kind` passa a aceitar `card_payment` além de `expense/income/transfer`.
- `fin_transactions.installment_no int`, `installment_total int`, `purchase_group_id uuid` (todos nulos = compra à vista).
- `fin_transactions.paid_card_month date` (mês da fatura quitada por um `card_payment`).
- Índices: `(card_id, occurred_on)`, `(purchase_group_id)`, `(card_id, paid_card_month)`.
- Todos os dados atuais continuam válidos (campos novos ficam nulos).

## O que muda no código (frontend)

- `TransactionDialog`: campo Cartão + toggle Parcelar; novo modo "Pagar fatura".
- `FinanceContext`:
  - `getCardStatement(cardId, monthISO)` — período fechamento→vencimento, total, % limite, pago, status.
  - `getCardCategoryBreakdown(cardId, monthISO)` — ranking + delta vs mês anterior.
  - `getCardActiveInstallments(cardId)` — agrupa por `purchase_group_id`, marca "acaba mês que vem".
  - `getCardPaymentsForMonth(monthISO)` — pra linha separada no Resumo.
  - Todos os helpers de despesa (`getMonthTotals`, categorias, "A Pagar", `BillsToPay`) passam a **excluir** `kind = 'card_payment'`.
- Nova tela `CardStatement.tsx` + seletor de cartões na aba Cartões.
- Nova tela `ReviewCardPayments.tsx` acessível pelo card do cartão.
- Aba Cartões passa a mostrar `CardStatement` por padrão; cadastro vira modal "Gerenciar cartões".

## Ordem de entrega

1. Migração (schema).
2. Regra anti-duplicação nos helpers + novo modo "Pagar fatura" no diálogo.
3. `CardStatement` + nova home da aba Cartões.
4. Parcelamento no diálogo + geração das linhas.
5. Tela "Revisar pagamentos de fatura".

## Fora do escopo

- Juros de fatura / rotativo automático (fatura fica "Parcialmente paga", sem cálculo).
- Importação de fatura OFX/CSV.
- Estorno de parcela individual (deletar apaga o grupo inteiro).
- Cartão PJ (mantém só PF por enquanto).
