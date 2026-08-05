# Inbox: 139 vs 75 no Trello — rotinas ficam só como recorrência

Números confirmados no banco: 139 itens no total, sendo **64 de recorrência** e **75 normais** — exatamente os 75 que foram para o Trello. O sync está correto; o contador do Inbox é que está somando as rotinas.

Os 64 recorrentes:

| Série | Horário | Dias | Itens |
|---|---|---|---|
| Moove | 06:00 | seg/qua/sex | 26 |
| Pilates | 16:00 | ter/qui | 18 |
| Wake | 08:00 | dom | 8 |
| Pilates — séries antigas apagadas (itens concluídos órfãos) | — | — | 12 |

## O que ajustar

1. **Contador do Inbox**: passar a contar apenas o que aparece na tela — itens sem recorrência e não concluídos (~62). Rotinas deixam de ser somadas em qualquer lugar do Inbox.
2. **Rotinas ficam onde pertencem**: continuam aparecendo apenas na Agenda/HD como recorrência, nunca no Inbox nem no Trello (comportamento atual, mantido).
3. **Limpeza dos 12 órfãos**: remover os itens de Pilates concluídos cujas séries já não existem, para não poluírem histórico e contagens.
4. **Card do Trello (Configurações)**: mostrar "X itens sincronizáveis" e a nota de que rotinas não vão para o Trello; toast de sync passa a dizer "X de Y sincronizáveis".

## Detalhes técnicos

- `src/pages/InboxPage.tsx`: trocar `items.length` do cabeçalho por contagem memoizada com o mesmo filtro das views (`!recurrence_id && fase !== 'Concluído'`).
- `src/components/TrelloCard.tsx`: usar `useCentral` para exibir a contagem de sincronizáveis e ajustar textos.
- Migração pontual de limpeza: `delete from items where recurrence_id is not null and recurrence_id not in (select id from recurrences)`.
- Sem alteração na edge function `trello-sync` nem no schema.
