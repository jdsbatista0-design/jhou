# Compromissos recorrentes + lembretes push no celular

Hoje a Agenda só aceita compromisso único e o sistema não envia nenhum tipo de notificação. Vou adicionar duas coisas:

1. **Recorrência**: você cria "Pilates - seg/qua às 7h" uma vez e o sistema materializa as próximas ocorrências como Items na agenda (cada uma marcável como feita/faltei).
2. **Push real no celular**: instalando o Central na tela inicial, você passa a receber notificação mesmo com o app fechado, X minutos antes de cada compromisso (configurável por compromisso).

---

## 1. Recorrência de compromissos

### Banco
Nova tabela `recurrences`:
- `id, user_id`
- `title, area, type` (Pilates, Reunião, etc.)
- `time` (HH:mm)
- `weekdays` (jsonb: `[1,3]` = seg/qua, padrão ISO 1-7)
- `start_date`, `end_date` (opcional)
- `reminder_minutes` (int, ex: 30) — antecedência padrão dessa recorrência
- `last_materialized_until` (date) — até onde já gerou ocorrências
- `active` (bool)

Itens gerados ganham 2 colunas novas em `items`:
- `recurrence_id` (uuid, nullable) — link para a regra-mãe
- `reminder_minutes` (int, nullable) — override por ocorrência
- `reminder_sent_at` (timestamptz) — para o worker não disparar duas vezes

### Materialização
- Ao criar/editar uma recorrência: gera ocorrências dos próximos **60 dias** como Items (`tipo: 'Compromisso'`, `fase: 'Em andamento'`, `deadline`, `deadlineTime`).
- Cron diário (pg_cron + pg_net) chama edge function `materialize-recurrences` que estende a janela para sempre manter 60 dias à frente.
- Editar a regra → regenera só as ocorrências futuras ainda não concluídas.
- Cada ocorrência pode ser concluída, remarcada ou apagada individualmente sem afetar a regra.

### UI
- Em **Agenda** > botão "Novo Compromisso" ganha aba **"Repete"** com:
  - Toggle "Repetir"
  - Chips de dias da semana (S T Q Q S S D)
  - Hora
  - Duração da regra (data fim opcional)
  - Antecedência do lembrete (10/30/60/1440 min)
- Nova seção **Configurações > Recorrências**: lista, editar, pausar, apagar.
- Cada Item gerado mostra um chip "🔁 Pilates" linkando para a regra.

---

## 2. Notificações push (PWA)

### Stack
- `vite-plugin-pwa` com `manifest.json` (nome "Central", ícone, `display: standalone`, `theme_color`).
- Service worker próprio (`public/sw.js`) registrado **só fora de iframe e fora de host de preview Lovable** (proteção obrigatória — preview do editor não receberá push, só o app publicado/instalado).
- Web Push API com VAPID keys.

### Banco
Tabela `push_subscriptions`:
- `id, user_id, endpoint (unique), p256dh, auth, user_agent, created_at`

### Edge functions
- `push-subscribe` — salva a subscription do navegador.
- `push-send` — recebe `{ title, body, url }` e dispara via Web Push (lib `web-push` no Deno).
- `dispatch-reminders` — roda a cada **1 minuto** via pg_cron:
  - busca Items com `deadline+deadlineTime` entre `now + reminder_minutes - 1min` e `now + reminder_minutes`,
  - que tenham `reminder_minutes IS NOT NULL` e `reminder_sent_at IS NULL`,
  - dispara push para todas as subscriptions do `user_id`,
  - marca `reminder_sent_at = now()`.

### Secrets necessários
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` — vou gerar no setup e te pedir para adicionar (uma vez só).
- `VAPID_SUBJECT` — seu email (`mailto:`).

### UI
- Em **Configurações** > nova seção **"Notificações"**:
  - Status: "Push ativo neste dispositivo" / "Ativar push".
  - Botão "Ativar" → pede permissão → registra subscription.
  - Botão "Testar lembrete" (dispara push em 10s).
  - Aviso claro: "Para funcionar com app fechado: instale o Central na tela inicial (Compartilhar → Adicionar à Tela de Início no iPhone, ou menu do navegador no Android). Requer iOS 16.4+ no iPhone."
- Banner discreto no Início se push não estiver ativo e tiver compromissos próximos.

### Limitações que eu vou comunicar na UI
- Push não funciona dentro do preview do editor Lovable — só no app publicado e instalado.
- iPhone exige iOS 16.4+ E o app instalado via "Adicionar à Tela de Início" (Apple não permite push em Safari normal).
- Se o celular estiver desligado/sem rede, push chega quando voltar online.

---

## Arquivos afetados

**Novos**
- `supabase/migrations/...` (recurrences, push_subscriptions, colunas novas em items, cron jobs)
- `supabase/functions/materialize-recurrences/index.ts`
- `supabase/functions/push-subscribe/index.ts`
- `supabase/functions/push-send/index.ts`
- `supabase/functions/dispatch-reminders/index.ts`
- `public/sw.js`, `public/manifest.json`, ícones
- `src/lib/push.ts` (registro/permissão/guard de iframe e preview)
- `src/components/RecurrenceForm.tsx`
- `src/pages/NotificationsSettings.tsx` (ou seção dentro de SettingsPage)

**Editados**
- `src/types/central.ts` — tipos `Recurrence`, novos campos em `Item`.
- `src/contexts/CentralContext.tsx` — CRUD de recurrences, leitura.
- `src/pages/AgendaPage.tsx` — formulário com toggle "Repete".
- `src/pages/SettingsPage.tsx` — seções Recorrências e Notificações.
- `src/components/ItemCard.tsx` — chip "🔁" e antecedência do lembrete.
- `vite.config.ts` — `vite-plugin-pwa` com `devOptions.enabled: false` e denylist do `/~oauth`.
- `package.json` — `vite-plugin-pwa`.

---

## Ordem de execução
1. Migration (recurrences + push_subscriptions + colunas em items + cron diário materialização).
2. Edge function `materialize-recurrences` + UI de criar/listar recorrência na Agenda e Settings.
3. PWA (manifest, ícones, vite-plugin-pwa, guard anti-iframe).
4. Geração das VAPID keys + pedido para você colar como secrets.
5. Edge functions `push-subscribe` / `push-send` / `dispatch-reminders` + cron de 1 minuto.
6. Tela de Notificações em Settings com botão Ativar e Testar.

Confirma que posso seguir assim?
