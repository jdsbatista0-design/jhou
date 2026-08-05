# Por que "139" no Inbox e 75 no Trello

Verifiquei os números no banco:

- 139 itens no total
- 64 são itens de **recorrência** (rotinas: Pilates, Wake, etc.)
- 75 são itens normais — e são exatamente os 75 que foram para o Trello

Ou seja: o sync está correto. Rotinas são propositalmente ignoradas (não faz sentido criar centenas de cards repetidos no Trello). O problema real é o **contador do Inbox**, que mostra 139 (todos os itens do banco) enquanto a lista na tela já esconde rotinas e concluídos. Ele nunca bate com o que você vê nem com o que sincroniza.

## O que ajustar

1. **Contador do Inbox honesto**: passar a contar apenas os itens que realmente aparecem na tela (sem rotinas, sem concluídos) — hoje ~62. O número no cabeçalho passa a corresponder ao que está listado.
2. **Transparência no card do Trello (Configurações)**: mostrar quantos itens são sincronizáveis e uma nota curta de que rotinas não vão para o Trello, para o número nunca mais parecer "faltando".
3. **Mensagem do sync**: ao sincronizar, informar "X de Y sincronizáveis" em vez de só "X itens enviados".

## Detalhes técnicos

- `src/pages/InboxPage.tsx`: substituir `items.length` no cabeçalho por uma contagem memoizada com o mesmo filtro usado pelas views (`!recurrence_id && fase !== 'Concluído'`).
- `src/components/TrelloCard.tsx`: exibir contagem de itens sincronizáveis (via `useCentral`) e ajustar textos de toast/descrição.
- Sem mudanças na edge function `trello-sync` e sem mudanças de schema.
