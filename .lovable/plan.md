## Objetivo

Transformar a aba **Cartões** num centro de controle do seu maior fluxo de dinheiro: saber, em segundos, **quanto vai sair nos próximos meses**, **onde você está gastando mais** e **o que está parcelado**.

## Diagnóstico do que existe hoje

- Cada cartão só mostra a fatura do mês selecionado — não dá pra ver o horizonte.
- Não há visão consolidada "todos os cartões juntos".
- Ranking de categorias existe só dentro de 1 cartão/1 mês. Sem visão agregada nem "top 5 do trimestre".
- Parcelamentos aparecem por cartão, sem soma total nem cronograma futuro.
- Recorrências financeiras (Netflix, escola no cartão etc.) não entram na projeção.

## Nova jornada — 3 blocos dentro da aba Cartões

### 1. Topo — Panorama de todos os cartões
Um único card no topo, sempre visível:
- **Total em aberto agora** (soma de faturas em aberto de todos os cartões).
- **Próximo vencimento** (cartão, valor, quantos dias faltam).
- **Comprometido em parcelas** (soma de todas as parcelas futuras).
- **Utilização média do limite** (barra agregada).

### 2. Previsão dos próximos 6 meses
Nova seção **"Próximos meses"**: uma linha por mês (mês atual + 5 seguintes) mostrando:
- Total previsto a pagar no mês (parcelas em aberto + recorrências no cartão + fatura fechada quando existir).
- Detalhe expansível: quanto vem de cada cartão.
- Alerta visual quando o mês tem pico acima da média.

```text
Nov/26  R$ 4.820   ██████████░░  [Nubank 2.100 · Itaú 1.720 · Inter 1.000]
Dez/26  R$ 6.150   ████████████  ↑ acima da média  [pico: parcela final TV]
Jan/27  R$ 3.900   ████████░░░░
...
```

### 3. Onde você mais gasta (todos os cartões, últimos 3 meses)
Ranking agregado de categorias somando compras de **todos os cartões** dos últimos 90 dias:
- Top 8 categorias com valor total, % do gasto e variação vs. os 3 meses anteriores.
- Toque na categoria abre as compras que a compõem.

### 4. Lista de cartões (mantém, mas mais enxuta)
Cada cartão vira um card compacto com: nome, fatura em aberto, próxima parcela, utilização.
Ao expandir → detalhe atual (extrato mensal, parcelamentos, quitar fatura) que já existe.

## Detalhes técnicos

Novos helpers em `FinanceContext`:
- `getCardsForecast(months: number)` → soma por mês futuro (parcelas + recorrências no cartão + fatura fechada não paga).
- `getCardsGlobalBreakdown(monthsBack: number)` → ranking de categorias agregando todos os cartões.
- `getCardsSummary()` → totais globais para o cabeçalho.

Novos componentes:
- `src/components/finance/CardsDashboard.tsx` — orquestra os 3 blocos.
- `src/components/finance/CardsForecast.tsx` — previsão 6 meses.
- `src/components/finance/CardsTopCategories.tsx` — ranking agregado.
- `src/components/finance/CardsSummary.tsx` — panorama do topo.

`CardsManager.tsx` continua existindo, mas passa a ser renderizado abaixo dos novos blocos (lista dos cartões).

Sem migration de banco — todas as informações já estão em `fin_transactions` (`purchaseGroupId`, `installmentNo/Total`, `paidCardMonth`, `cardId`, `categoryId`).

## Fora de escopo desta rodada

- Mudanças no fluxo de "Pagar fatura" (já refinado).
- Mudanças na aba **Tudo/A Pagar/Categorias/Resumo**.
- Recorrências e outras áreas do sistema.
