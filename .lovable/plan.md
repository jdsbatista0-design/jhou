## Notas de Reuniões na Memória/HD

Adicionar suporte a **notas de reuniões e eventos** dentro da Memória existente, com campos próprios e vínculo opcional com a Agenda/Item.

### 1. Nova categoria "Reuniões" 📋

Adicionar `'reunioes'` em `MemoryCategory` e `MEMORY_CATEGORIES` (`src/types/central.ts`), com ícone 📋.

### 2. Campos extras da categoria

Estender `Memory` (e tabela `memories`) com colunas opcionais usadas só nessa categoria:

- `meeting_date` (data da reunião)
- `participants` (texto livre, separado por vírgula)
- `decisions` (texto)
- `next_steps` (texto)
- `linked_item_id` (uuid, opcional — vincula ao Item da agenda correspondente)

Migration adiciona essas 5 colunas em `memories` (nullable). Sem mudança de RLS.

### 3. Formulário no `MemoryPage.tsx`

Quando categoria = "Reuniões", o dialog mostra:

- Data da reunião (default: hoje)
- Título (ex: "Reunião com Stone — comercial")
- Participantes
- Conteúdo / Notas (campo principal, multiline)
- Decisões
- Próximos passos
- Seletor opcional "Vincular a Item da agenda" (lista os Items com `deadline` recente/futuro)
- Tags

### 4. Card especializado

Renderização própria para reuniões (similar ao bloco de Senhas):

- Cabeçalho com 📋 + título + data formatada
- Badge de participantes (contagem)
- Seções colapsáveis: Notas / Decisões / Próximos passos
- Se vinculado a Item: chip "→ Ver Item" navegando para `/item/:id`

### 5. Próximos passos viram Itens (1 clique)

Botão **"Criar Item a partir destes passos"** no card. Abre prompt simples: cada linha de `next_steps` vira um Item novo com:

- `tipo: 'Ação'`
- `fase: 'Em andamento'`
- `area`: herdada do Item vinculado (ou "Pessoal")
- Título = a linha
- Descrição = referência à reunião ("De: <título da reunião> em <data>")

### 6. Atalho a partir da Agenda

Em `AgendaPage.tsx` / `ItemDetail.tsx`, adicionar botão **"📋 Adicionar nota da reunião"** nos eventos/Items com data. Pré-preenche título, data e `linked_item_id` ao abrir o dialog da Memória.

### 7. Filtro e busca

A categoria "Reuniões" entra na barra de tabs já existente. Busca também procura em `participants`, `decisions`, `next_steps`.

### Arquivos afetados

- `src/types/central.ts` — categoria + tipo
- migration: `ALTER TABLE memories ADD COLUMN ...` (5 colunas)
- `src/contexts/CentralContext.tsx` — mapear novos campos no fetch/insert de memórias
- `src/pages/MemoryPage.tsx` — formulário condicional + card de reuniões + botão "criar Itens"
- `src/pages/AgendaPage.tsx` e `src/pages/ItemDetail.tsx` — botão "Adicionar nota"
- `mem://features/memory-knowledge-base` — atualizar com nova categoria

### Fora de escopo (pode vir depois)

- Transcrição de áudio da reunião
- IA extraindo automaticamente decisões/próximos passos do texto bruto
- Compartilhar ata por link

Posso seguir?