# Finanças: aba "Economizar" — gasto por categoria e onde cortar

Hoje o Financeiro mostra o mês atual e um resumo simples de categorias. Falta a visão que responde "quanto gasto por categoria, o que é repetido todo mês e o que posso cortar".

## O que aparece na nova aba

Nova aba **Economizar**, dentro de Finanças (ao lado de Tudo / A Pagar / Categorias / Resumo).

1. **Gasto por categoria (3, 6 e 12 meses)**
   - Ranking com total, média por mês, % do gasto e comparação com o período anterior (subiu/caiu).
   - Toque na categoria abre a lista dos maiores lançamentos dela.

2. **Gastos que se repetem todo mês (candidatos a corte)**
   - Detecta o mesmo estabelecimento aparecendo em 3 meses ou mais e mostra custo por mês e por ano.
   - Já dá para ver casos como Porto Seguro (18 lançamentos), Inglês (R$ 340/mês = R$ 4.080/ano), Mercado Livre (22 compras), Expedia, academia/Pilates.
   - Cada linha tem um rótulo: assinatura/serviço fixo, compras avulsas frequentes.

3. **Parcelas: quanto ainda devo e o que está acabando**
   - Total parcelado comprometido por mês nos próximos 6 meses.
   - Lista "acaba em X meses" com quanto de folga isso libera por mês.

4. **Metas de economia**
   - Sugestão de corte por categoria discricionária (ex.: Lazer, Alimentação, compras online) com o valor em reais que a redução de 10% / 20% / 30% geraria por mês e por ano.
   - Compara com a meta mensal já cadastrada em Categorias e mostra quem estourou.

5. **Ajuste dos dados sem categoria**
   Há 11 despesas sem categoria somando R$ 27.173,40 — as maiores são "Ajuste de fatura (a mais)" (R$ 10.650) e Dízimo/Ofertas (R$ 11.196). Enquanto elas ficam sem categoria, a análise fica distorcida. A aba mostra um aviso no topo com botão para categorizar em lote (e um atalho para marcar Dízimo/Oferta numa categoria própria).

## Detalhes técnicos

- Novo componente `src/components/finance/SavingsInsights.tsx` (lazy) e nova seção `insights` em `src/pages/FinancePage.tsx`.
- Novos helpers em `src/contexts/FinanceContext.tsx`, todos calculados em memória sobre `transactions` (sem mudança de schema):
  - `getCategoryTrends(monthsBack)` — total, média/mês, % e delta vs período anterior.
  - `getRecurringMerchants(monthsBack)` — agrupa por descrição normalizada, conta meses distintos, retorna custo mensal médio e anualizado.
  - `getInstallmentOutlook(months)` — soma por mês das parcelas futuras e séries que terminam em breve (usa `purchase_group_id` / `installment_total`).
  - `getUncategorized()` — despesas sem `category_id` para o bloco de ajuste.
- Reaproveita `getCardsGlobalBreakdown` e `monthly_budget` das categorias; a aba usa período próprio (3/6/12 meses), independente do `MonthNavigator`.
- Sem alterações no banco e sem mexer na lógica de faturas/pagamentos já existente.
