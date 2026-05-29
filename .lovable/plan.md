
# Refactor visual + UX do Central — Camada A

Foco: redesenhar a interface, navegação e captura conforme o prompt enviado, **sem alterar o schema do banco** nem remover funcionalidades existentes (Finanças PF/PJ, Memory, tags, Agenda derivada, AI inbox via Gemini, Google Calendar, recorrências).

## Decisões confirmadas
- Escopo: **só Camada A** (visual + navegação + captura). Backend permanece intacto.
- 4 abas no bottom nav: **Hoje, Inbox, Agenda, Financeiro** (sem aba "Projetos").
- QuickCapture mantém pipeline atual com **Gemini (`interpret-content`)** + UX nova (bottom sheet Vaul, mic, chips, undo).
- Memory/Painel/Relatórios/Configurações continuam acessíveis (via menu de perfil no header), só saem do bottom nav.

## Etapas

### Etapa 1 — Design system OLED
- Atualizar `src/index.css` com tokens HSL semânticos:
  - `--background` (#0B0F14), `--surface` (#141A22), `--surface-2` (#1C2530)
  - `--foreground` (#E8EEF5), `--muted-foreground` (#8A97A8)
  - `--primary` (#3B82F6), `--success` (#10B981), `--warning` (#F59E0B), `--destructive` (#EF4444)
  - Tokens de business unit: `--bu-badin` (gold), `--bu-bj7-midia` (blue), `--bu-izi` (green), `--bu-bj7-consultoria` (purple) — só para chips.
- Atualizar `tailwind.config.ts` com as novas cores, radius (12 cards, 8 chips), font families.
- Importar **Inter** (UI) e **JetBrains Mono** (valores/datas/IDs) via `<link>` no `index.html`.
- Substituir `box-shadow` por `border: 1px solid hsl(var(--surface-2))` nos cards.
- Garantir `prefers-reduced-motion` no `index.css`.
- Forçar dark como padrão (já é o caso); deixar plumbing para toggle futuro.

### Etapa 2 — AppShell + Navegação
- Criar `src/components/AppShell.tsx`: header sticky 56px (saudação + data + avatar/menu de perfil), conteúdo com `px-4 pb-24`, slot para bottom nav e FAB.
- Refatorar `src/components/BottomNav.tsx` para 4 abas: **Hoje (`/`), Inbox (`/inbox`), Agenda (`/agenda`), Financeiro (`/financas`)**. Altura 64px, ícones Lucide, label curto, ativo em `--primary`, alvo ≥44px.
- Avatar no header abre um dropdown com: Painel, Memória, Relatórios, Configurações, Logout (mantém acesso ao que sai do nav).
- Refatorar `src/App.tsx` para envolver as rotas com `<AppShell>`. Manter todas as rotas existentes funcionais.

### Etapa 3 — FAB + QuickCapture (Vaul bottom sheet)
- Instalar `vaul` (drawer mobile-first).
- Criar `src/components/CaptureFAB.tsx`: botão circular 56px, canto inferior direito, margem 16px, acima do bottom nav (z-index correto).
- Reescrever `src/components/QuickInput.tsx` como `<QuickCapture>` dentro de um `<Drawer>` Vaul (snap points 50% e 90%):
  - Textarea autofocus com placeholder "O que precisa ser feito ou pago?"
  - Botão de microfone (Web Speech API, fallback silencioso)
  - Heurística local enquanto digita: detecta `R$`/valores → sugere "lançamento financeiro"; "lembrar/avisar" → "lembrete"; senão "tarefa". Detecta datas PT-BR com `date-fns` + parser simples.
  - Chips abaixo para refinar tipo/área/prazo (multi-tap troca)
  - Botão "Salvar" full-width 48px no rodapé; Enter também salva
  - **No salvar**: continua chamando a edge function `interpret-content` (Gemini) com o texto + chips como hints, igual hoje
  - Toast Sonner com undo de 5s após salvar
- Remover o input fixo atual em favor do FAB.

### Etapa 4 — Tela Hoje (redesign)
- Refatorar `src/pages/Dashboard.tsx` (ou criar `HojePage`) como rota `/`:
  - **Banner alerta** no topo se houver items urgentes vencendo hoje (cor: vencido `--destructive`, hoje `--warning`, importante `--primary`).
  - **Bloco Matriz Eisenhower** (2x2): Urgente+Importante, Importante, Urgente, Backlog. Até 3 items por quadrante + "ver +N". Mapeia para `priority` existente em `items`.
  - **Bloco "Vence em 7 dias"**: cards de `fin_transactions` com `kind='expense'` e `status!='paid'` nos próximos 7 dias.
  - Swipe-right marca feito/pago, swipe-left edita/remarca (`react-swipeable`).
  - Empty states com CTA apontando para o FAB.

### Etapa 5 — Tela Inbox (polimento)
- Refatorar `src/pages/InboxPage.tsx`:
  - Lista cronológica reversa de items sem `deadline` OU sem `area` clara.
  - Filtro fixo no topo: [Todos] [Tarefas] [Compromissos] [Lembretes] (mapeia para `tipo`).
  - Ação rápida "Triar" abre bottom sheet curto com chips (urgente, área, data).

### Etapa 6 — Tela Financeiro (polimento, **sem mexer no schema**)
- Refatorar `src/pages/FinancePage.tsx`:
  - Segmented control: [Vence em breve] [Pagas] [Calendário] **como visão principal**, mantendo as abas atuais (Contas, Cartões, Categorias, Pessoas, Empresas, Novo lançamento) em um menu "Gerenciar".
  - "Vence em breve": 3 totalizadores (semana, próxima, resto do mês) usando `fin_transactions` `kind='expense'` não pagas.
  - Cards com vendor (description), chip de BU (mapeado de `scope`/`company_id`), valor em **JetBrains Mono**, dias para vencer com cor por urgência.
  - Swipe-right = `status='paid'`, swipe-left = remarcar (date picker).
  - "Pagas": últimas 30 com `status='paid'`.
  - "Calendário": grid mensal com pontos coloridos por dia com vencimento.

### Etapa 7 — Agenda (polimento leve)
- Manter `src/pages/AgendaPage.tsx` derivada de items, só aplicar novos tokens visuais, swipe e empty state.

### Etapa 8 — Qualidade & PWA
- Adicionar skeleton loaders em todas as queries (substituir spinners).
- Garantir empty state com CTA em toda lista vazia.
- Verificar contraste 4.5:1, foco visível keyboard, alvo tátil ≥44px.
- Adicionar `public/manifest.json` simples (sem service worker) para "Adicionar à tela inicial". **Não** adicionar `vite-plugin-pwa` (causa problemas no preview Lovable, conforme guidelines).
- Sweep final removendo emojis usados como ícone (substituir por Lucide).

## Detalhes técnicos

```text
src/
  components/
    AppShell.tsx           (novo: header + outlet + bottom nav + FAB)
    BottomNav.tsx          (refatorado: 4 abas)
    CaptureFAB.tsx         (novo)
    QuickCapture.tsx       (novo, substitui QuickInput)
    ProfileMenu.tsx        (novo: dropdown do avatar)
  pages/
    Dashboard.tsx          (refatorado: Matriz + 7 dias)
    InboxPage.tsx          (refatorado: filtros + triar)
    FinancePage.tsx        (refatorado: segmented control + swipe)
    AgendaPage.tsx         (polimento visual)
  index.css                (novos tokens HSL)
tailwind.config.ts         (novas cores/fonts/radius)
index.html                 (fonts + manifest link)
public/manifest.json       (novo)
```

Dependências novas: `vaul`, `react-swipeable` (se ainda não estiver). `sonner` já existe.

## Riscos & mitigações
- **Risco**: trocar tokens de cor pode quebrar componentes shadcn existentes. **Mitigação**: manter todos os nomes semânticos shadcn (`background`, `foreground`, `primary`, etc.) e só ajustar os valores HSL — nenhuma classe `bg-foo-500` direta vai precisar mudar.
- **Risco**: swipe em mobile conflitar com scroll. **Mitigação**: usar `react-swipeable` com `delta` mínimo e threshold horizontal.
- **Risco**: Vaul + bottom nav fixo competirem por gestos. **Mitigação**: drawer cobre tela inteira quando aberto, sem conflito.

## Fora desta rodada (Camada B, exige decisão de produto)
- Entidade "Projetos" agrupando items + transações.
- Substituir `fin_transactions` por `bills`.
- Remover Memory/HD ou tags controladas.
- Edge function `send_reminders` + Web Push + VAPID (deixar para fase seguinte; o prompt original menciona, mas é Etapa B no seu próprio roadmap de memória).

## Sobre commits semânticos
O Lovable já versiona automaticamente após cada batch de mudanças. Não tenho acesso ao `git` para fazer commits manuais — você verá o histórico no painel do projeto. Se quiser eu agrupo as etapas em mensagens claras de chat para servir como changelog.

---

**Sobre "isso melhora seu sistema?"**: sim, a Camada A melhora muito — identidade visual, captura mais rápida, foco operacional na Hoje, navegação mais limpa. A Camada B do prompt eu **não recomendo** porque jogaria fora o módulo Finanças PF/PJ, a Memory e o pipeline de AI que você já tem funcionando.
