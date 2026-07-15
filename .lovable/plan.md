
## Contexto

Três problemas na tela de Finanças / shell:
1. A barra de status do iOS cobre o avatar/perfil no topo — o header não respeita `safe-area-inset-top`.
2. Em **Configurações → Cartões**, só dá para criar/excluir cartão. Não existe editar (dia de fechamento, dia de vencimento, limite, nome, cor) nem informar o valor de uma fatura já fechada (útil quando não lancei todas as compras individualmente).
3. O botão "**+ Novo lançamento**" aparece em **todas** as abas do módulo Financeiro, inclusive nas de cadastro (Contas, Cartões, Categorias), onde não faz sentido.

## Mudanças

### 1) Header respeita a status bar
`src/components/AppShell.tsx`:
- Aplicar `padding-top: env(safe-area-inset-top)` no `<header>` e ajustar altura para `h-14 + safe-area`.
- Garantir o mesmo tratamento no fundo (já existe no FAB/BottomNav).

Resultado: avatar/perfil sempre clicável, sem sobreposição do relógio 22:46.

### 2) Editar cartão + valor manual de fatura fechada
`src/components/finance/CardsManager.tsx`:
- Adicionar botão de **lápis** (edit) ao lado do lixeirinha em cada cartão.
- Ao clicar, expandir um form inline (ou dialog leve) com os mesmos campos do "Novo cartão": nome, bandeira, limite, dia de fechamento, dia de vencimento, cor, conta vinculada.
- Salvar via `updateCard(id, patch)` — método a ser adicionado ao `FinanceContext` (update simples na tabela `fin_cards`).

`src/components/finance/CardStatement.tsx`:
- Quando `statement.status === 'closed'` (ou usuário quiser sobrescrever), mostrar um input pequeno **"Valor real da fatura"** com botão **Salvar**.
- Persistir em um novo campo em `fin_cards`? Melhor: novo campo/tabela leve `fin_card_statements(card_id, month_iso, closed_amount, paid_amount, paid_on)` OU um simples registro na própria tabela `fin_transactions` como `kind='card_statement_adjust'`. Para não inflar schema, vou usar um lançamento tipo `card_adjustment` (novo kind) que **substitui** o total do mês quando presente — `getCardStatement` passa a considerar esse valor se existir, ignorando a soma das compras individuais daquele mês.
- Isso resolve o caso "não lancei todas as compras, quero só bater o valor da fatura fechada".

Nota: essa lógica requer 1 migração pequena adicionando o novo kind à enum + ajuste no `getCardStatement` para priorizar o ajuste manual.

### 3) FAB "Novo lançamento" só onde faz sentido
`src/pages/FinancePage.tsx`:
- Mostrar o botão "**+ Novo lançamento**" apenas nas seções operacionais: `transactions` (Tudo), `bills` (A Pagar), `budgets` (Categorias), `overview` (Resumo).
- **Esconder** em `accounts`, `cards`, `categories` (cadastros) — cada uma já tem seu próprio botão "Novo X" contextual.

## Detalhes técnicos

- Novo método `updateCard(id, patch)` em `src/contexts/FinanceContext.tsx` + tipo em `src/types/finance.ts` (patch parcial de `Card`).
- Novo `kind: 'card_adjustment'` em `fin_transactions` (migração enum ALTER TYPE ... ADD VALUE). Excluído de `EXPENSE_KINDS` (não é despesa nova, é ajuste de fatura).
- `getCardStatement`: se existir uma transação `card_adjustment` no mês da fatura → usar `amount` dela como `total`, mantendo lista de compras só para exibição informativa.
- Header: `style={{ paddingTop: 'env(safe-area-inset-top)' }}` no `<header>` e altura total via `min-h-14`.

## Fora de escopo

- Redesenhar a navegação de cadastros (a engrenagem em si).
- Notificações push / recorrências.
