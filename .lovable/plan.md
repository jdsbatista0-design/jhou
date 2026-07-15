
## Problema

Hoje o módulo Financeiro tem 3 confusões:

1. **Engrenagem ambígua** — a engrenagem esconde "Contas", "Cartões" e "Categorias (cad.)". Fica escondido demais para algo que o usuário abre toda hora, e mistura cadastro operacional (contas/cartões) com cadastro estrutural (categorias).
2. **Cartão editado em dois lugares** — dá pra editar cartão pelo lápis dentro da aba Cartões *e* pelo mesmo lápis quando expande a fatura, com botões diferentes ("Novo lançamento" no topo, "Novo cartão" logo abaixo, "Pagar fatura" dentro do extrato…).
3. **Fatura confusa** — o "Total da fatura" ora é a soma das compras lançadas, ora é o valor manual (override), sem deixar claro qual é qual nem o que fazer com a diferença.

## Como fica no final

### Navegação (barra de abas do Financeiro)

Sai a engrenagem. Ficam 5 abas fixas, agrupadas em 2 blocos visuais:

```text
[ Tudo ] [ A Pagar ] [ Categorias ] [ Resumo ]  |  [ Contas ] [ Cartões ]
   ^^^ operacional (mostra + Novo lançamento)      ^^^ cadastros
```

- Bloco esquerdo (operacional): mostra o `MonthNavigator` e o botão `+ Novo lançamento`.
- Bloco direito (cadastros): sem seletor de mês, sem botão global. Cada tela tem seu próprio `+ Nova conta` / `+ Novo cartão`.
- Cadastro de **categorias** deixa de ser uma aba separada — vira um botão "Gerenciar categorias" dentro da aba **Categorias** (já é a tela de metas). Um único lugar para orçamento + cadastro.

### Cartão de crédito — um único ponto de edição

- Na aba **Cartões**, o cartão vira uma linha com nome, limite, fatura aberta e um único botão "Abrir". Sem lápis fora.
- Ao abrir, aparece o extrato do mês com:
  - **Editar cartão** (nome, bandeira, fechamento, vencimento, conta vinculada) no topo do extrato.
  - **Excluir cartão** ao lado.
  - Navegação por mês da fatura.
  - Ações da fatura (ver abaixo).

Deixa de existir a duplicidade de lápis "na lista" e "no extrato".

### Lógica da fatura (a parte importante)

Cada mês do cartão tem sempre 2 números que o sistema exibe lado a lado, com rótulo claro:

```text
┌─────────────────────────────────────────────┐
│ Somei das suas compras     R$ 2.180,00      │  ← calculado dos lançamentos
│ Fatura fechada (banco)     R$ 2.250,00  ✏️  │  ← valor manual informado
│ Diferença                  R$   70,00       │
│                                             │
│ [ Lançar diferença como "Ajuste" ]          │
│ [ Pagar fatura ]                            │
└─────────────────────────────────────────────┘
```

Regras claras:

- Enquanto o mês está **em aberto**, o sistema considera o valor "Somei das suas compras" como total. Não pede nada.
- Quando o cartão fecha (passa do `closingDay`), aparece o campo "Fatura fechada (banco)" pedindo o valor real que o banco mandou.
  - Se o usuário informar e bater com o somado → some o alerta.
  - Se houver diferença → mostra o valor e oferece **"Lançar diferença como Ajuste"**, que cria um único lançamento no cartão daquele mês, categoria "Ajuste de fatura", pra fechar a conta. Sem apagar o histórico.
- O botão **"Pagar fatura"** desce a fatura a pagar (usa o valor considerado — informado se houver, senão o somado) e registra uma transferência da conta escolhida para o cartão, sem duplicar despesa.

### Onde lanço o quê

Fica uma regra simples, apoiada no botão `+ Novo lançamento` (único, na barra operacional):

- **Gasto no cartão** → tipo "Saída" + selecionar cartão. Vai automaticamente para a fatura do mês certo (respeita fechamento).
- **Compra parcelada** → mesma tela, campo "Parcelas". Já existe.
- **Pagamento de conta / boleto** → tipo "Saída" + selecionar conta bancária.
- **Pagar fatura do cartão** → botão "Pagar fatura" dentro do extrato do cartão (mais direto). Alternativa: tipo "Pagamento de cartão" no diálogo.

O tipo "Pagamento de cartão" no menu suspenso ganha um subtítulo explicativo: "use quando quitar a fatura — não conta como despesa nova".

## Detalhes técnicos

- `src/pages/FinancePage.tsx`
  - Remover `showConfig` e `configSections`. Renderizar 6 abas fixas em 2 grupos, com um divisor visual entre operacional e cadastros.
  - `showPeriod` e o botão `+ Novo lançamento` continuam só nas 4 abas operacionais.
  - Remover `categories` das abas (fica dentro de `CategoryBudgets`).

- `src/components/finance/CardsManager.tsx`
  - Remover formulário inline de edição na lista. Manter só criação.
  - Cada card vira linha compacta com botão "Abrir" que expande o `CardStatement`.
  - Passar `onEdit` / `onDelete` para dentro do `CardStatement`.

- `src/components/finance/CardStatement.tsx`
  - Novo cabeçalho com "Editar cartão" e "Excluir cartão".
  - Bloco "Total da fatura" substituído pelo bloco de 2 linhas + diferença, com rótulos "Somei das suas compras" e "Fatura fechada (banco)".
  - Novo botão "Lançar diferença como Ajuste" quando `override != null && override !== computed`. Cria uma `fin_transactions` no cartão com `description = "Ajuste de fatura"`, categoria "Ajuste" (criar se não existir, ou usar categoria genérica), `occurredOn` = último dia do período da fatura.
  - Estado da fatura ("Em aberto" / "Fechada" / "Paga") continua no canto.

- `src/components/finance/CategoryBudgets.tsx`
  - Adicionar um botão discreto "Gerenciar categorias" no topo que abre o `CategoriesManager` num `Sheet` ou navega para uma sub-view. Mantém a tela de metas como principal.

- `src/components/finance/TransactionDialog.tsx`
  - No `Select` de tipo, adicionar `description` curta em "Pagamento de cartão" ("quita a fatura, não é despesa nova").
  - Sem mudança de lógica.

- Nenhuma migração de banco. `statement_overrides` já existe; só passa a ser lido/gravado com rótulo mais claro. O "Ajuste de fatura" é uma `fin_transactions` normal com `cardId` preenchido.

## Fora de escopo

- Não mexer em Agenda, Dashboard, Memória.
- Não mudar cores/tema.
- Não trocar a lógica de recorrência financeira.
