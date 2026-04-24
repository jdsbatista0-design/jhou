## Vou olhar isso como usuário, do começo ao fim

Você tocou em dois pontos. Vou tratar cada um, e ainda fazer o passeio completo "pensando como alguém usando" pra mostrar o que tá quebrado de coerência.

---

## Problema 1 — Reabrir não devolve a tarefa pra fase certa

**O que acontece hoje:** clico no círculo de uma tarefa concluída → o sistema joga ela em **"Inbox"** (independentemente de onde estava: "Em andamento", "Travado", "Aguardando"…). Pior: não tem memória de qual era a fase anterior.

**Correção:**
- Adicionar campo `previousFase` em `Item` (e coluna `previous_fase` em `items`).
- Ao **concluir**: salvar `previousFase = fase atual`, então setar `fase = 'Concluído'`.
- Ao **reabrir**: setar `fase = previousFase || 'Em andamento'` e limpar `previousFase`.
- Aplicar nos 3 pontos onde isso é tocado: `ItemCard.tsx`, card "Agora" do `DashboardStories.tsx`, e dropdown de fase do `ItemDetail.tsx`.
- Toast: `"Reaberto em {fase}"`.

---

## Problema 2 — Página `/items` é um zumbi

A gente concentrou tudo no Início (stories `Agora / Urgentes / Inbox / Em andamento / Travado / Concluídos`), mas a página `/items` continua viva e o `ItemDetail` ainda redireciona pra ela ao salvar/voltar/excluir. É por isso que você "caiu numa tela que não deveria existir".

**Correção:**
- Apagar `src/pages/ItemsPage.tsx`.
- Remover rota `/items` em `src/App.tsx` (manter só `/items/:id` para o detalhe).
- Trocar todos os `navigate('/items')` em `ItemDetail.tsx` por `navigate('/')`.

---

## Agora o passeio "como usuário" — o que falta de coerência

Olhei o fluxo real de quem entra no app, e tem **lacunas claras** entre o que existe na tela de Item e o que aparece no Início:

### a) Não existe atalho para "criar um Item direto"
Hoje o FAB (+) só joga texto/áudio/foto no **Inbox** — nunca cria um Item já estruturado. Se o usuário sabe exatamente o que quer ("Pagar boleto da luz, prioridade alta, sexta"), ele tem que: capturar no inbox → abrir → processar → virar item. Sobra atrito.

**Correção:** adicionar 4ª opção no menu do FAB → **"Item"**, que abre direto o `ItemDetail` em modo `new` (rota `/items/new`, que já existe).

### b) Campos do Item invisíveis no Início
O Item tem: **prioridade, deadline, hora, pessoa, valor, descrição, tags, comentários**. No `ItemCard` (usado nos stories) só aparecem: prioridade, área, fase, tipo, deadline, pessoa. Some:
- **Hora** (`deadlineTime`) — sumiu, mesmo sendo usada na agenda.
- **Valor** (`R$`) — invisível, mesmo o usuário tendo digitado.
- **Indicador de comentários** — não dá pra saber se a tarefa tem histórico sem abrir.
- **Tags** — chave do sistema (você até tem grupos), mas não aparecem no card.

**Correção no `ItemCard`:**
- Mostrar hora junto da data quando `deadlineTime` existir (`📅 25 abr · 14:30`).
- Mostrar valor formatado quando `value > 0` (`💰 R$ 1.250,00`).
- Mostrar contador `💬 N` quando `comments.length > 0`.
- Mostrar até 3 tags (resto como `+N`).

### c) Story "Agora" mistura agenda+itens mas trata diferente
- Para um **item agendado** que está concluído, o card mostra strikethrough e botão Reabrir corretamente (depois do fix do Problema 1).
- Para um **evento standalone** (não vinculado a item), clicar no círculo **deleta** o evento. Isso é destrutivo e não tem confirmação. Confunde com "concluir".

**Correção:** trocar a ação de "deletar evento" por uma confirmação curta antes, ou pelo menos mudar o ícone (um `X` ao invés do círculo de check) pra deixar claro que é remoção, não conclusão.

### d) Faltam fases no fluxo visível
Settings tem 5 fases: `Inbox / Em andamento / Aguardando / Travado / Concluído`. Os stories cobrem 4: `Inbox / Em andamento / Travado / Concluídos`. **"Aguardando" sumiu** — itens nessa fase só aparecem se você cair em outro filtro coincidente. Como usuário, é uma fase importante ("aguardando retorno do João") que vira um buraco negro.

**Correção:** adicionar story `aguardando` (ícone Hourglass) entre "Em andamento" e "Travado".

### e) Inbox: resta só ver pendentes
O story Inbox só lista `status = 'pending'`. Tudo bem. Mas, quando um inbox vira item, ele desaparece daqui sem deixar rastro visível no Início. Não é bug, mas vale o `InboxEntryCard` mostrar uma seta/mini-feedback de "→ virou item" quando processado e o usuário ainda tiver o card aberto. **Vou deixar isso fora deste ciclo** (não foi pedido), só anoto.

### f) Memória, Finanças, Agenda — cada um na sua ilha
Você falou "tudo que tem no sistema". Notei:
- **Finanças** tem aba própria (`/financas`), nunca aparece no Início. Se um lançamento vence hoje, o usuário não vê no "Agora". 
- **Memória** (senhas, receitas, etc.) idem.
- **Agenda standalone** aparece em "Agora" só se for hoje — tudo bem.

Não é bug, é decisão de produto. Vou **só anotar** isso aqui e perguntar depois se você quer expandir o "Agora" para puxar lançamentos financeiros do dia (vencimentos). Não mexo agora pra não inflar este ciclo.

---

## Plano consolidado (o que vou fazer)

1. **Migração SQL** — `ALTER TABLE items ADD COLUMN previous_fase text;`
2. **`src/types/central.ts`** — adicionar `previousFase?: string` em `Item`.
3. **`src/contexts/CentralContext.tsx`** — mapear `previous_fase ↔ previousFase` em fetch / insert / update; ajustar `updateItem` para automatizar a lógica quando a mudança envolve `Concluído`.
4. **`src/components/ItemCard.tsx`** —
   - Toggle inteligente (concluir/reabrir restaurando fase).
   - Mostrar hora, valor, contador de comentários e tags resumidas.
5. **`src/components/DashboardStories.tsx`** —
   - Mesmo toggle inteligente no card "Agora".
   - Trocar deleção silenciosa de evento por confirmação (`window.confirm` curto, ícone X).
   - Adicionar story `aguardando`.
6. **`src/components/CaptureFAB.tsx`** — adicionar 4º botão "Item" → `navigate('/items/new')`.
7. **`src/pages/ItemDetail.tsx`** —
   - Trocar todos os `navigate('/items')` por `navigate('/')`.
   - Aplicar lógica de `previousFase` quando o usuário muda fase manualmente para/from "Concluído".
8. **`src/App.tsx`** — remover rota `/items` (manter `/items/:id`).
9. **`src/pages/ItemsPage.tsx`** — deletar.
10. Buscar referências residuais a `/items` (rota base) no resto do código e ajustar.

**Resultado esperado:**
- Reabrir tarefa volta pra fase original, não pra "Inbox".
- Página fantasma `/items` deixa de existir; salvar/voltar leva pro Início.
- FAB ganha atalho para criar Item já estruturado.
- Card do Item no Início mostra os dados que você de fato preencheu (hora, valor, comentários, tags).
- Fase "Aguardando" deixa de ser invisível.
- Eventos standalone não somem mais por engano ao toque acidental.

Quer aprovar assim ou ajustar algo (ex.: adiar o ponto **f** ou expandir)?
