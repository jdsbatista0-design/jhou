## Ajustes propostos

### 1. Hoje — prioridade personalizada
No `HomeToday.tsx`, além de "Escolher item existente", permitir digitar uma prioridade livre (texto puro).
- Bottom sheet do slot ganha um campo de texto no topo: "Escrever prioridade…" com botão "Adicionar".
- Ao confirmar, cria um `Item` mínimo (title = texto, fase = "Em andamento", area = padrão do usuário, origin = "manual", kind = "my_action") e atribui ao slot via `setPriority`.
- Abaixo continua a lista de itens existentes para quem quiser vincular.

### 2. Inbox — regras de exibição
No `InboxList.tsx` / `InboxKanban.tsx` e no filtro base de itens:
- **Ocultar concluídos**: itens com `fase === 'Concluído'` saem da view padrão (mantém toggle "mostrar concluídos" opcional, colapsado).
- **Ocultar recorrentes materializados**: qualquer item com `recurrenceId` não aparece no Inbox (já é regra na Home; estender ao Inbox).
- **Mostrar data/hora quando houver**: cada card do Inbox exibe `deadline + deadlineTime` formatado (ex: "qua 22/07 · 16:00") com ícone de relógio, quando presentes.

Resultado: Inbox vira exclusivamente "tarefas e itens em organização" — sem ruído de rotina nem concluídos.

### 3. Agenda — fonte unificada + criação manual
`AgendaPage.tsx` já agrega Items com data + finanças pendentes + recorrências. Confirmar/reforçar:
- **Items com data/hora** (inclusive os criados via prioridade livre da Home, se tiverem deadline).
- **Recorrências** (pilates, rotina do HD) via materialização existente.
- **Finanças** (vencimentos pendentes) já entram via `financeEntries`.
- **Lançamento manual de compromisso**: o FAB contextual em `/agenda` já abre `AppointmentSheet`. Garantir que esse fluxo esteja visível e funcional (revisar copy do botão e do sheet para deixar claro "Novo compromisso").

### 4. Consistência de origem
Padronizar `origin` nos itens criados:
- Prioridade livre da Home → `origin: 'manual'`.
- Compromisso via AppointmentSheet → `origin: 'manual'` (recorrente = `'recurrence'`).
- Rotina do HD → `origin: 'recurrence'`.
Assim os filtros de Inbox/Agenda ficam previsíveis.

### Detalhes técnicos
- `HomeToday.tsx`: novo estado `customText`; handler cria item via `addItem({ title, fase: 'Em andamento', area, kind: 'my_action', origin: 'manual' })` e em seguida `setPriority(slot, newItem.id)`.
- `InboxList.tsx` + `InboxKanban.tsx`: adicionar filtro `.filter(i => i.fase !== 'Concluído' && !i.recurrenceId)` na fonte de dados. Renderizar chip de data/hora quando `deadline` presente (usar `parseLocalDateTime` de `src/lib/dates.ts`).
- `AgendaPage.tsx`: sem mudança estrutural; validar FAB e copy do AppointmentSheet.
- Sem mudanças de schema nem migrations.

### Fora de escopo
- Financeiro (não mexer).
- Recompor lógica de recorrência ou push.
