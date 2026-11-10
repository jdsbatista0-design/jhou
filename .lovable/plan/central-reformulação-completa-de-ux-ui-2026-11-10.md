# Central — reformulação completa de UX/UI

Objetivo: um app que você abre e em 3 segundos sabe **o que fazer hoje** e **quanto tem que pagar**. Menos abas, menos botões, uma ação principal por tela.

## Nova navegação (3 abas)

```text
[ Hoje ]   [ Dinheiro ]   [ Rotinas ]
```

- **Agenda + Hoje viram "Hoje"**: abre no dia atual.
- **Contas + Cartões viram "Dinheiro"**: tudo de pagamento num lugar só.
- **Rotinas** continua, simplificada.
- Ajustes ficam no avatar (topo).

## Hoje
- Topo: data + "3 compromissos · 1 conta vence hoje".
- Faixa de 7 dias rolável (toque troca o dia); calendário do mês abre só se pedir.
- Lista única do dia em ordem de horário: compromissos, rotinas (com check) e vencimentos (com "Pagar").
- Um único botão "+" que abre direto "Novo compromisso" (título, dia, hora, repetir). Nada de menu com 4 opções.

## Dinheiro
Uma tela, rolagem vertical, sem sub-abas:

1. **Painel do mês** (navegação ‹ mês ›): "Falta pagar R$ X" grande, "pago R$ Y", próximo vencimento.
2. **A pagar**: uma linha por fatura de cartão e por conta fixa, com vencimento e botão "Pagar" (valor já preenchido). Pagas recolhem num "Ver pagas (3)".
3. **Próximos meses**: barras dos 6 meses seguintes (parcelas já assumidas).
4. **Onde gastei**: top 5 categorias do mês + aviso "X compras sem categoria → Classificar".
5. Ações no topo: **Importar fatura (PDF)** e **Nova conta fixa**.

Tocar numa fatura abre a fatura daquele cartão em tela cheia: total oficial, lista de compras (editar/excluir/categorizar com 1 toque), parcelas e "Pagar".

**Classificar rápido**: tela que mostra uma compra sem categoria por vez, com as categorias em chips grandes. Um toque e passa para a próxima (resolve as 172 pendentes em minutos).

Saem: abas Lançamentos/Resumo/Categorias/Economizar/Gestão/Meus cartões como telas separadas (o conteúdo útil vira as seções acima; cadastro de cartões e categorias vai para Ajustes).

## Rotinas
- Lista agrupada por período (Manhã / Tarde / Noite) com dias da semana em chips.
- Criar/editar num único painel: nome, dias, hora. Ao salvar, aparece no Hoje.

## Visual
- Mantém "Papel quente" (claro, verde #0F4C3A, Outfit + Figtree), com mais espaço, tipografia maior, números alinhados, 1 cor de destaque por tela.
- Alvos de toque ≥ 44px, sem ícones soltos sem texto, estados vazios que dizem o que fazer.

## Detalhes técnicos
- Novas páginas: `TodayPage`, `MoneyPage`, `InvoiceScreen`, `QuickCategorize`; rotas `/hoje`, `/dinheiro`, `/rotinas`, `/ajustes`; redirects das antigas (`/agenda`, `/contas`, `/cartoes`, ...).
- Reaproveita `FinanceContext` (getCardStatement por mês de vencimento), `CentralContext` (agenda/recorrências), `ImportInvoiceDialog`, `TransactionDialog` simplificado.
- Remove componentes que deixam de ser usados (FinanceOverview, CategoryBudgets, SavingsInsights, CardsForecast, CardsTopCategories, TransactionsList etc.).
- Sem mudança no banco; dados atuais preservados.
- Verificação com Playwright em viewport 440x807 de cada fluxo: criar compromisso, marcar rotina, pagar fatura, importar PDF, classificar compra.
