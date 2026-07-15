
## Etapa 1 — Fundação de período + regras de cálculo

Escopo isolado no módulo Financeiro. Sem migração de schema. Inbox, Agenda, HD e Dashboard não são tocados.

### Observação importante sobre nomes de coluna
O prompt fala em `due_date`, mas hoje o schema usa `occurred_on` como data de competência do lançamento (e `status = 'pending' | 'confirmed' | 'cancelled'`). Vou tratar `occurred_on` como o "vencimento" para toda a regra de competência — sem criar coluna nova. Se depois quiser separar `emissão × vencimento × pagamento`, é migração dedicada e fica fora desta etapa.

### 1. `src/components/finance/MonthNavigator.tsx` (novo)
- Controle `◄  Novembro 2026  ►` com botão "Hoje".
- Props: `value: string` (formato `YYYY-MM`), `onChange(next)`, `className?`.
- Formatação em pt-BR ("novembro de 2026"), primeira letra maiúscula.
- Botão "Hoje" desabilitado quando já é o mês corrente.
- Acessibilidade: `aria-label` nos botões prev/next.

### 2. `FinancePeriodContext`
Arquivo próprio: `src/contexts/FinancePeriodContext.tsx`.

- Estado: `monthISO: string` (default = mês corrente `YYYY-MM`).
- Ações: `setMonth(iso)`, `goPrev()`, `goNext()`, `goToday()`.
- Derivados expostos: `monthStart: Date`, `monthEnd: Date`, `isCurrentMonth: boolean`.
- `Provider` embrulha o conteúdo de `FinancePage`.
- Hook `useFinancePeriod()`.

`FinancePage` renderiza o `MonthNavigator` no topo, acima das abas — visível em todas (Resumo, Tudo, A Pagar, Categorias). Aba Cadastros ignora o período.

### 3. Helpers no `FinanceContext`
Todos derivados do estado já existente em memória — não fazem novas queries.

```ts
getMonthTotals(monthISO): {
  pago: number;         // Σ confirmed income  no mês  ⟶  na verdade "recebido"
  recebido: number;     // Σ confirmed income (kind income/receivable) no mês
  aPagar: number;       // Σ pending expense no mês + vencidas de meses anteriores
  aReceber: number;     // Σ pending income no mês
  saldo: number;        // recebido − pago(saídas confirmadas)
}
```

- "Pago" = Σ saídas confirmadas (`kind` de saída, `status='confirmed'`) com `occurred_on` dentro do mês.
- "Recebido" = Σ entradas confirmadas dentro do mês.
- "A pagar" = Σ pendentes de saída com `occurred_on` no mês **+** Σ pendentes de saída com `occurred_on` anterior ao mês selecionado, quando o mês selecionado é o mês corrente (regra "vencidas não somem").
- "Saldo do mês" = recebido confirmado − pago confirmado.

```ts
getUpcomingBills(days): FinTransaction[]  // pending expense, occurred_on entre hoje e hoje+days, ordenado asc
getCategoryTotals(monthISO): Array<{ categoryId, name, color, total }>  // saídas confirmadas por categoria
getYearMatrix(year): {
  categories: FinCategory[];
  months: string[];                  // 12 chaves 'YYYY-MM'
  expenseMatrix: number[][];         // [categoria][mês]
  incomeMatrix: number[][];
}
```

Todos memoizados por `useMemo` sobre `transactions`, `categories` — sem custo de rede.

### 4. Integração nas abas existentes
- `TransactionsList` (aba Tudo) e `BillsToPay` (A Pagar) passam a filtrar por `monthISO` do contexto. Filtros próprios de período são removidos, mas a busca de texto e chips de tipo continuam.
- `CategoryBudgets` (Categorias) usa `getCategoryTotals(monthISO)` para o progresso do mês selecionado (hoje é sempre mês corrente).
- Selo "vencida" (badge vermelho) aparece nas linhas cuja `occurred_on < hoje` e `status='pending'` — regra visual só; a lógica de contagem já cobre isso em `getMonthTotals`.

### 5. Arquivos afetados

**Criar:**
- `src/components/finance/MonthNavigator.tsx`
- `src/contexts/FinancePeriodContext.tsx`

**Editar:**
- `src/pages/FinancePage.tsx` — embrulha com `FinancePeriodProvider` e renderiza `MonthNavigator` no topo.
- `src/contexts/FinanceContext.tsx` — adiciona os 4 helpers e expõe no `value`.
- `src/components/finance/TransactionsList.tsx` — consumir `monthISO`, remover filtro de período próprio, adicionar selo "vencida".
- `src/components/finance/BillsToPay.tsx` — consumir `monthISO`, incluir vencidas de meses anteriores quando o mês selecionado é o corrente.
- `src/components/finance/CategoryBudgets.tsx` — passar a usar `getCategoryTotals(monthISO)`.

### Critério de aceite
- Navegar mês a mês filtra as três listas simultaneamente.
- No mês corrente, contas pendentes vencidas de meses anteriores aparecem no topo com selo "vencida" e são contadas em `aPagar`.
- Em meses futuros ou passados, o filtro é estrito por `occurred_on` naquele mês.
- Helpers retornam os totais esperados (verificação manual em 2–3 casos).

### Fora de escopo desta etapa
- Aba Resumo, gráficos, aba Recorrentes, aba Histórico e fatura do cartão — vêm nas etapas 2, 3 e 4.
- Qualquer mudança em Inbox, Agenda, HD, Dashboard.
- Migração de schema (renomear `occurred_on` → `due_date`, por exemplo).
