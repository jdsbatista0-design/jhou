## 1. Recorrentes só no calendário (fora do Inbox)

- Itens com `recurrenceId` (ou `origin === 'recurrence'`) deixam de aparecer no **Inbox Kanban** (em qualquer agrupamento, fase ou área).
- Continuam aparecendo na **Agenda** (calendário, lista do dia e tab "Recorrentes").
- Ponto violeta no calendário já existe — mantém.
- Exceção: se uma ocorrência específica for marcada como "pendente / travada" manualmente, ainda pode reaparecer no Inbox? **Não nesta rodada** — recorrência sempre vive na Agenda.

## 2. Vencimentos financeiros no calendário

- `fin_transactions` com `due_date` e status "a pagar/receber" geram entradas virtuais na Agenda (não duplicam em `items`).
- `fin_recurrences` materializam ocorrências futuras na Agenda dentro do horizonte (mesma lógica de 60 dias).
- Ponto âmbar no calendário (já reservado para `origin === 'finance'`).
- Clique no dia mostra a despesa com botão "Marcar como paga" que abre o ticking direto em `BillsToPay`.

## 3. Memória / HD vira tab principal

- Bottom nav passa para **5 tabs**: Hoje · Inbox · Agenda · Financeiro · HD.
- Remover HD/Memória do menu de Configurações (vira atalho só).
- Página HD ganha sub-tabs por categoria (chips já existem; viram navegação principal):
  Geral · Reuniões · Senhas · Receitas · Viagens · Livro · Rotina · Desejos · Propósito.

### 3.1 Meu Livro
- Adicionar campo de **anexo** (PDF/imagem do capítulo, foto manuscrita).
- Cada entrada de Livro = { título do capítulo/trecho, conteúdo, anexo, comentário pessoal }.
- Storage bucket privado `memory-attachments`.

### 3.2 Senhas (cofre)
- Já existe estrutura (`login`, `password`, `url`). Reforçar:
  - Senha armazenada **cifrada** no campo `password` usando `src/lib/crypto.ts` com o PIN global.
  - Mostrar/copiar exige PIN se o usuário tiver PIN ativo.
  - Botão "Gerar senha forte" no formulário.

### 3.3 Receitas
- Novos campos por categoria `receitas`:
  - `ingredients` (texto multilinha), `steps` (texto multilinha), `servings`, `time` (minutos), `attachment` (foto do prato).
- Card mostra foto, tempo, porções e botão "Ver receita completa".

### 3.4 Viagens (guia por destino)
- Já agrupa por cidade. Adicionar **sub-tipo** dentro de cada memória de viagem:
  - `travelKind`: 'hotel' | 'restaurante' | 'lugar' | 'dica'.
  - `address`, `rating` (1–5), `priceRange` ('$'/'$$'/'$$$'), `mapsUrl`.
- Render por cidade com mini-seções: Hotéis · Restaurantes · Lugares · Dicas.

### 3.5 Rotina → calendário
- Categoria `rotina` ganha campos `weekdays` + `time` (igual recorrência).
- Salvar uma rotina cria automaticamente uma **Recurrence** com `origin = 'recurrence'`, vinculada à memória (campo `linkedRecurrenceId`).
- Editar/excluir a rotina sincroniza a recorrência.
- Aparece no calendário com ponto violeta.

## 4. Schema

Migration única:

```sql
ALTER TABLE public.memories
  ADD COLUMN attachment_url TEXT,
  ADD COLUMN comment TEXT,
  ADD COLUMN ingredients TEXT,
  ADD COLUMN steps TEXT,
  ADD COLUMN servings INT,
  ADD COLUMN time_minutes INT,
  ADD COLUMN travel_kind TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN rating INT,
  ADD COLUMN price_range TEXT,
  ADD COLUMN maps_url TEXT,
  ADD COLUMN weekdays INT[],
  ADD COLUMN routine_time TEXT,
  ADD COLUMN linked_recurrence_id UUID;
```

Storage bucket privado `memory-attachments` + policies por `auth.uid()`.

## 5. Arquivos

**Editar:**
- `src/components/BottomNav.tsx` — adicionar tab HD.
- `src/components/inbox/InboxKanban.tsx` — filtrar `recurrenceId`/`origin==='recurrence'`.
- `src/contexts/CentralContext.tsx` — `agendaEntries` derivar também de `fin_transactions` e `fin_recurrences`.
- `src/components/agenda/AgendaCalendar.tsx` — clique em dia financeiro com ação "marcar pago".
- `src/pages/MemoryPage.tsx` — sub-tabs reais, novos campos por categoria, anexo, cifragem de senha, criação/sync de Recurrence para rotina.
- `src/pages/SettingsPage.tsx` — remover entrada redundante de Memória.
- `src/types/central.ts` — extender `Memory` com novos campos.

**Criar:**
- `src/components/memory/AttachmentUploader.tsx` — upload para `memory-attachments`.
- `src/components/memory/RecipeCard.tsx`, `TravelCard.tsx`, `PasswordCard.tsx`, `BookCard.tsx`, `RoutineForm.tsx`.
- Storage bucket via tool.

## 6. Fora de escopo
- Sincronizar receitas/viagens com Google Drive.
- OCR de anexo de livro.
- Compartilhamento de senhas com outra pessoa.
- Importação de extrato bancário para vencimentos.
