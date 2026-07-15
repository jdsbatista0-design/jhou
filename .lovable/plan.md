
## Problemas

1. **Não dá pra lançar compromisso recorrente direto.** Hoje o único caminho é HD → Rotina. Na Agenda não há nenhum botão de "Novo compromisso", e o `RecurrencesManager` só lista/pausa/exclui — não cria.
2. **Rotina do HD duplica na Agenda.** Dois bugs somados:
   - `MemoryPage.handleAdd` cria a `Recurrence` mas grava a Memory com `linkedRecurrenceId = undefined` (a variável nunca é preenchida). Sem link, qualquer edição/regravação da rotina cria uma **nova** recorrência → materializa Items em paralelo → duplica no calendário.
   - Apagar a memória de Rotina não apaga a recorrência órfã, que continua materializando Items no horizonte de 60 dias.
3. **FAB "+" fora de contexto.** Abre sempre um menu com 4 opções (Texto, Áudio, Foto, Item). Na Agenda deveria abrir direto **Novo compromisso** (o básico do módulo); na Inbox, captura rápida; nas demais, o menu atual.

## Como fica

### FAB contextual (`CaptureFAB.tsx`)

O botão passa a decidir a ação pelo `location.pathname`:

```text
/agenda          → abre "Novo compromisso" (sheet dedicado, ver abaixo)
/inbox           → abre direto o modo "Texto" (captura rápida)
/index (Hoje)    → mantém o menu atual (Texto / Áudio / Foto / Item)
/financas /memory→ continua escondido (têm CTAs próprios)
```

O menu de 4 opções deixa de ser o padrão universal — vira só o fallback da Home.

### Novo sheet "Compromisso" (aberto pelo FAB na Agenda)

Um único formulário curto, mobile-first:

```text
Título            [____________________]
Data              [ 15/07/2026 ]   Hora [ 16:00 ]
Área              [ Pessoal ▾ ]
Tipo              [ Compromisso ▾ ]  (Reunião, Visita, Prazo…)
Lembrete          [ 30 min antes ▾ ]

[ ] Repete
   └── Dias:  S T Q Q S S D
        Termina em: [ opcional ]

[ Salvar ]
```

- Sem "Repete" → cria um `Item` único com `deadline` + `deadlineTime` (aparece na Agenda como sempre).
- Com "Repete" → cria uma `Recurrence` (materializa via lógica já existente). **Não** cria Item avulso além dos materializados.

Esse mesmo sheet fica reutilizável (o botão "Novo" dentro da aba **Recorrentes** também passa a abri-lo, com "Repete" já ligado).

### Rotina do HD — fim das duplicatas

`MemoryPage.tsx` (`handleAdd` e o fluxo de edição de rotina):

- Guardar o `id` retornado por `addRecurrence` e gravar em `memory.linkedRecurrenceId`. Isso exige `addRecurrence` retornar o `id` (hoje é `Promise<void>`).
- Ao **editar** uma memória de Rotina que já tem `linkedRecurrenceId`, chamar `updateRecurrence(linkedRecurrenceId, { weekdays, time, title, active })` em vez de `addRecurrence` de novo.
- Ao **excluir** uma memória de Rotina, apagar também a recorrência vinculada (`deleteRecurrence(linkedRecurrenceId, true)`) para não deixar órfã materializando Items.
- Dedupe defensivo já existente no `CentralContext` continua limpando qualquer resíduo antigo no primeiro load.

## Detalhes técnicos

- `src/contexts/CentralContext.tsx`
  - `addRecurrence` passa a retornar `Promise<string | null>` (o `id` criado). Ajustar a assinatura no tipo do contexto.
- `src/components/CaptureFAB.tsx`
  - Ler `location.pathname` e mapear para um `intent`: `appointment` (Agenda), `text` (Inbox), `menu` (Home).
  - `intent === 'appointment'` abre o novo `AppointmentSheet` em vez do menu.
  - `intent === 'text'` abre o sheet já existente direto no `mode='text'`.
- `src/components/AppointmentSheet.tsx` (novo)
  - Form controlado com os campos acima. Usa `settings.areas` e `settings.agendaTypes`.
  - Sem "Repete": `addItem({ title, area, tipo: 'Compromisso', fase: 'Em andamento', deadline, deadlineTime, reminderMinutes, tags: [tipo] })`.
  - Com "Repete": `addRecurrence({ title, area, type, time, weekdays, startDate: hoje, endDate, reminderMinutes, active: true })`.
- `src/components/RecurrencesManager.tsx`
  - Adicionar botão "Novo compromisso recorrente" no topo, abrindo o mesmo `AppointmentSheet` com `repeat=true` pré-ligado.
- `src/pages/MemoryPage.tsx`
  - Capturar `const recId = await addRecurrence(...)` e passar em `linkedRecurrenceId`.
  - Implementar caminho de edição/exclusão da rotina que respeita o `linkedRecurrenceId` (update em vez de novo insert; delete em cascata).

## Fora de escopo

- Não mudar Financeiro, Dashboard, HD (fora da categoria Rotina), tema/cores.
- Não mudar o motor de materialização de recorrências nem o horizonte de 60 dias.
- Push notifications continuam adiadas.
