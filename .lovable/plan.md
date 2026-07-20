
# Central v2 — desafogador diário

Você tem razão em tudo. O plano abaixo assume: o valor está nas **regras invisíveis**, não em telas novas. Cada passo é pequeno e usável sozinho.

Sem projetos, sem metas 90d, sem revisão semanal guiada, sem mapa da vida, sem fechamento longo. Isso volta quando o básico provar que funciona.

---

## Passo 1 — Nova Home (3 blocos)

**Bloco AGORA** — próximo compromisso do dia (Item com deadline+hora OU AgendaEvent OU compromisso do Google Calendar). Card grande: horário, título, local se houver, pessoas se houver. Ações: abrir rota (Maps), ligar/whatsapp para a pessoa, "abrir contexto" (ver bloco 5).

**Bloco HOJE** — 3 slots de prioridade. Nada mais.
- Vazio → CTA "Escolher da Inbox / Da semana".
- Ações de 1 toque em cada slot: ✓ concluir · ⏭ adiar amanhã · 👤 delegar (marca "aguardando quem?") · ✎ substituir.
- Adicionar 4ª → modal "Qual das 3 vai sair?".
- "Entrou depois" aparece abaixo como faixa cinza pequena com os itens que viraram urgentes no dia mas não substituíram nenhuma prioridade (visível, sem inflar a lista dos 3).

**Bloco PENDÊNCIAS HUMANAS** — dois mini-cards lado a lado no mobile:
- **Me devem** (Items com status `waiting_someone`)
- **Devo resposta** (Items com status `my_decision` ou `my_action` marcados como bloqueadores)
- Ordenado por score: `atraso_dias * peso + impacto + bloqueados`. Não expõe o cálculo, só o resultado.
- Cada linha mostra: título curto + "há X dias" + "bloqueia Fulano" quando aplicável.

**Fim da Home.** Removo `DashboardStories` (7 stories) inteiro.

---

## Passo 2 — Ações de 1 toque, sem abrir tela

Toda linha de Item na Home ganha swipe/menu contextual:
- ✓ Concluir → sai da Home imediatamente
- ⏭ Adiar (hoje+1, amanhã, semana que vem)
- 👤 Delegar → prompt curto "para quem?" → vira "Me devem"
- ⏳ Aguardando → vira "Me devem" sem pessoa
- 💬 Responder → deep-link pro WhatsApp/telefone da pessoa se houver contexto
- 📖 Abrir contexto → drawer com bloco 5

Zero navegação pra ItemDetail em fluxo diário. ItemDetail continua existindo para edição pesada, mas você não é obrigado a entrar.

---

## Passo 3 — Recorrência some de tudo que não é Agenda

Já está parcialmente feito (Dashboard filtra `recurrenceId`), mas Inbox, busca global e "Devo resposta" ainda podem pegar recorrentes. Auditoria: **em nenhum feed que não seja `/agenda` uma linha com `recurrenceId` aparece.** Uma única função `isDailyFeedEligible(item)` usada em todo lugar.

---

## Passo 4 — Classificação automática (a peça central)

Novo campo `Item.kind`: `'my_action' | 'waiting_someone' | 'my_decision' | 'appointment' | 'info'`.

A edge function `interpret-content` (que já usa Gemini) passa a devolver `kind` além de `tipo/fase/prioridade`. Prompt reescrito com exemplos:

- "Aprovar tabela Casa Bali" → `my_decision`
- "Bruno vai me mandar o contrato" → `waiting_someone` + `waitingFor: "Bruno"`
- "Comprar presente Luana" → `my_action`
- "Reunião Stone quarta 14h" → `appointment`
- "Nota fiscal da obra Daytona ref out/26" → `info` (arquiva, some da Home, fica pesquisável)

Regras automáticas derivadas de `kind`:
- `info` → nunca aparece na Home, vai pro HD/Memória (categoria "Arquivo" nova, ou "geral") e é indexado pra busca.
- `waiting_someone` → cai em "Me devem".
- `my_decision` → cai em "Devo resposta" com peso maior no score.
- `appointment` → cai na Agenda; não aparece em "Hoje" a não ser que você escolha.
- `my_action` → candidato normal a virar prioridade do dia.

IA sempre pode errar → toda captura tem "desfazer classificação" no card por 24h (muda o `kind` manualmente).

---

## Passo 5 — Preservar contexto da origem

Novo campo `Item.source_context` (jsonb):
```
{
  channel: 'whatsapp' | 'audio' | 'text' | 'photo' | 'manual',
  sender: 'Bruno Prendin',
  sender_phone: '+55...',
  original_message: '...',
  media_url: '...',      // áudio, imagem, doc
  captured_at: '2026-...'
}
```

Drawer "Abrir contexto" (do passo 2) mostra tudo isso + resumo da IA. Sem precisar voltar pro WhatsApp.

Botão "Responder" abre `wa.me/<phone>` direto se `sender_phone` existir.

---

## Passo 6 — Item sem prazo não some (loop de reaparição)

Novo campo `Item.last_surfaced_at`.

Regra: item com `kind=my_action` sem `deadline` e não tocado há >7 dias entra num pool. Todo dia de manhã, o sistema pega até **3 desse pool** e mostra num card na Home:

> "3 ideias antigas esperando decisão"
> - Item A → [Hoje] [Agendar] [Delegar] [Arquivar] [Excluir]
> - Item B → ...
> - Item C → ...

Cada decisão atualiza `last_surfaced_at` (adia reaparição por N dias) ou tira o item do pool. Nunca aparece mais de 3 por dia. Sem cemitério, sem poluição.

---

## Passo 7 — Captura por áudio (a captura principal)

FAB central vira **segurar-pra-gravar** por padrão (não menu de 4 opções):
- Toque curto → abre menu antigo (texto/foto/anexo) como fallback.
- Segurar → grava áudio (Web Audio API → WAV, conforme padrão Lovable AI).
- Solta → upload direto pra `interpret-content` → transcrição (`openai/gpt-4o-mini-transcribe`) + interpretação + criação do Item em uma chamada.
- Toast: **"Item criado: 'Falar com Bruno amanhã sobre entrada Daytona' · Desfazer · Editar"**
- Áudio original guardado em `source_context.media_url` (bucket `memory-attachments` que já existe).

Sem passar pela Inbox pendente. Sem confirmar 5 vezes.

Áudio duplicado detectado por hash + janela de 60s (evita capturas repetidas por erro).

---

## Passo 8 — WhatsApp → Inbox com contexto (última etapa)

Você já tem `supabase/functions/whatsapp-webhook`. Ativação real:
- Você configura o número no Twilio (secret `TWILIO_API_KEY` já existe).
- Encaminhar mensagem pro número → webhook → salva `inbox_entry` com `source='whatsapp'`, `whatsappFrom`, mídia original em bucket.
- Auto-dispara `interpret-content` → cria Item com `source_context` completo + `kind` classificado.
- Toast na próxima abertura do app: **"3 mensagens do WhatsApp viraram itens hoje · Ver"**.

Confio no fluxo do passo 4/5 pra classificar. Se `kind=info`, o item nasce arquivado — você nem vê a menos que busque.

---

## Ordem de entrega

Como você propôs, exatamente:

1. Nova Home (3 blocos) — sem depender do resto ainda usa dados atuais (kind vira default `my_action`).
2. Ações de 1 toque.
3. Recorrência some dos feeds.
4. Me devem / Devo resposta com ordenação por impacto.
5. Loop de reaparição de itens sem prazo.
6. IA classifica `kind` e cria direto.
7. Áudio como captura principal (FAB segurar-pra-gravar).
8. WhatsApp com contexto original.

Cada passo é uma entrega. Você usa 3–5 dias, me diz se aperta, seguimos.

---

## Detalhes técnicos

**Schema (uma migração no início do passo 1, resto conforme entra):**
- `items` ganha: `kind text`, `waiting_for text`, `impact_score int default 0`, `blocked_people int default 0`, `last_surfaced_at timestamptz`, `source_context jsonb`.
- Nova tabela `daily_priorities` (user_id, date, slot 1..3, item_id, added_at, replaced_from uuid nullable). RLS por `auth.uid()`. GRANTs pra `authenticated` + `service_role`.
- Backfill: todos os Items existentes começam com `kind='my_action'`, `impact_score=0`.

**Score de ordenação (server-side view ou client):**
```
score = (dias_desde_criacao * 2)
      + (atraso_deadline_dias * 5)
      + (impact_score)
      + (blocked_people * 3)
      + (tem_compromisso_ligado ? 10 : 0)
```
Ordena `Me devem` e `Devo resposta` desc. Cálculo no client (barato).

**Edge function `interpret-content`:**
- Prompt novo com os 5 `kind` e exemplos concretos do seu contexto (BJ7, Stone, IZI, Casa Bali, Daytona, Luana, meninas).
- Devolve também `waitingFor`, `impact_hint` ('alto'|'medio'|'baixo'), `blockedPeople` (número estimado).
- Fallback silencioso: se não classificar, `kind='my_action'`.

**Áudio:**
- Web Audio API → WAV 16kHz mono (padrão Lovable AI STT).
- Upload pro bucket `memory-attachments`, path `audio/{userId}/{uuid}.wav`.
- Chamada única à edge function que faz STT + interpret + insert. Volta com o Item pronto.

**Componentes a criar:**
- `HomeAgora.tsx`, `HomeToday.tsx`, `HomePending.tsx`, `HomeResurface.tsx`
- `ItemQuickActions.tsx` (swipe/menu)
- `ItemContextDrawer.tsx`
- `HoldToRecordFAB.tsx` (substitui uso principal do `CaptureFAB`; menu antigo continua acessível)

**Componentes a remover/limpar:**
- `DashboardStories.tsx` — vai embora inteiro.
- `QuickInput.tsx` — código morto, deleto.
- Campos `linkedAgendaIds` e `asset` do tipo Item (mortos).
- Categorias "Desejos" e "Propósito" da HD (inertes) — ou dou form básico, decidimos quando chegar.

**Não toco:**
- Financeiro (rotas, contextos, componentes, tabelas `fin_*`).
- Google Calendar sync existente.
- Bottom nav (5 abas fica).
- HD/Memória, exceto adicionar categoria "Arquivo" opcional pro `kind=info`.

---

## Fora deste plano (volta depois se pedir)

Projetos com marcos/orçamento, metas 90d, revisão semanal guiada, mapa da vida, indicadores das empresas, notificações push (`reminderMinutes` continua decorativo por enquanto), onboarding, multi-usuário, PWA offline, Conselheiro IA. Nada disso entra até os 8 passos acima estarem no seu dia.

---

**Aprovo e começo pelo passo 1?** Ou tem ajuste antes?
