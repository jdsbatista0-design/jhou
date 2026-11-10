# Cartões: painel "Gestão" com próximos meses, principais gastos e parcelas

Hoje há 326 lançamentos em 3 cartões ativos (jan/2026 a set/2027). A informação existe, mas está espalhada em abas pequenas. A proposta é uma única tela de leitura clara.

## Nova aba "Gestão" (primeira aba em Cartões)

1. **Faturas dos próximos 6 meses** — uma linha por mês: total, quanto é parcela já comprometida e quanto é compra nova, com divisão por cartão (C6, Nubank...). Mês atual destacado com vencimento e "já pago / falta pagar".
2. **Parcelas mês a mês** — gráfico de barras com o total de parcelas em cada mês até a última. Abaixo, "o que termina em cada mês" e quanto isso libera do orçamento ("Em jan/27 terminam 3 parcelas: -R$ 874/mês").
3. **Principais gastos** — top 5 categorias e top 5 estabelecimentos dos últimos 3 meses, com média mensal e se subiu ou caiu.
4. **Alertas para gerir** — limite usado por cartão, fatura acima da média, gastos repetidos todo mês (assinaturas) com custo anual.
5. Tocar em qualquer linha abre as compras daquele mês/categoria, com editar e excluir.

As abas Próximos meses e Onde gasto passam a fazer parte da Gestão (somem para não repetir). Fatura e Meus cartões continuam.

## Revisão das informações
- Conferir se as faturas importadas batem com o total do PDF e se há compras duplicadas ou sem categoria; mostrar um aviso no topo com botão para corrigir.

## Detalhes técnicos
- Novo `src/components/finance/CardsInsights.tsx` (lazy), usando `getCardStatement`, `getCardActiveInstallments`, `getCardCategoryBreakdown` e o total importado (`statementTotal`).
- Cálculos puros em `src/lib/cardInsights.ts` (projeção por mês, parcelas terminando, top categorias/estabelecimentos) com testes em `src/test/cardInsights.test.ts`.
- Respeita `financeVisibility`: nada aparece como pagamento individual em Contas. Sem mudança no banco.
