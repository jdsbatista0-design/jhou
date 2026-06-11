
# Plano: Refactor Inbox + Agenda + Financeiro (entrega única)

## 1. Mobile fix urgente (header)
- Header de 56px hoje quebra em telas estreitas (saudação + data + avatar competem).
- Trocar para layout compacto: avatar à esquerda (40×40), data à direita em mono pequeno, saudação some em <380px.
- Garantir `min-w-0` e `truncate` corretos; testar em 320px.

## 2. Captura unificada (Compromisso = Item)
- FAB único cria **Item**. Se o usuário (ou a IA Gemini) informar data/hora, o Item já entra com `dueDate`/`time` preenchidos.
- Remover qualquer botão/atalho separado de "novo compromisso".
- Agenda continua sendo **view derivada** dos Items com data (como já está documentado na memória).

## 3. Inbox — Kanban como visão única
- Remover filtros "Pendentes / Todas" e o toggle Lista/Kanban. Sempre Kanban.
- Topo do Kanban: toggle **Agrupar por: Fase | Área**.
- Colunas "Concluído" e "Arquivado" **ocultas por padrão**. Visíveis só ao abrir ⚙️ no canto do Kanban (mesma lógica da Memória/HD).
- Capturas brutas (`inbox_entries` ainda sem virar Item) viram uma faixa fina no topo do board, em vez de seção separada.
- Drag-and-drop e select inline continuam funcionando.

## 4. Agenda
- **Recorrências saem de Configurações** e entram dentro da Agenda como uma aba/seção (Calendário | Lista | Recorrências).
- Calendário passa a marcar também:
  - Itens criados pelo Financeiro (vencimentos de "A Pagar") — dot âmbar.
  - Itens criados pelo Inbox com data — dot azul.
- Tudo isso já existe como Item; só precisamos taggear visualmente por `origin` (inbox/financeiro/manual).

## 5. Financeiro — esconder PJ + refatorar PF "super inteligente"
- **Esconder toggle PF/PJ**: rota mostra só PF. PJ continua no banco mas sem UI nesta fase.
- **Recorrências financeiras**: tirar de Configurações, mover para o topo de "A Pagar" como aba (A Pagar | Recorrências).
- **Nova seção "Por Categoria"** (a dor principal): card por categoria mostrando gasto do mês, % do total, e progresso vs. meta.
- **Metas por categoria**: novo campo `monthly_budget` em `fin_categories`. UI inline para definir/editar a meta direto no card da categoria.
- **Alerta visual**: barra de progresso fica âmbar em 80% da meta, vermelha quando estoura.
- **Novo lançamento mais rápido**: dialog repensado — valor em destaque, categoria com chips das mais usadas no topo, data padrão hoje, conta padrão lembrada da última escolha.
- **Nova conta**: fluxo de 1 tela só (nome + tipo + saldo inicial), sem campos avançados na primeira tela.

## 6. Mudança de schema
- Adicionar `monthly_budget NUMERIC` em `fin_categories` (nullable, default null).
- Adicionar `origin TEXT` em `items` (`'inbox' | 'finance' | 'manual' | 'recurrence'`) para o Agenda taggear visualmente. Default `'manual'`.

## 7. Memória do projeto
- Atualizar `mem://features/finance-module` e `mem://features/recurrences-and-push` para refletir: PJ oculto nesta fase, recorrências dentro da Agenda/Financeiro, metas por categoria.
- Atualizar Core: "Compromisso = Item com data; FAB único".

---

## Detalhes técnicos

**Arquivos editados:**
- `src/components/AppShell.tsx` — header compacto mobile.
- `src/components/CaptureFAB.tsx` — garantir que crie Item único.
- `src/pages/InboxPage.tsx` + `src/components/inbox/InboxKanban.tsx` — sempre Kanban, toggle Fase/Área, ⚙️ para mostrar concluído/arquivado, faixa de capturas brutas no topo.
- `src/pages/AgendaPage.tsx` + `src/components/agenda/AgendaCalendar.tsx` — aba Recorrências, dots por origin.
- `src/pages/FinancePage.tsx` — remover toggle PF/PJ, remover seção Recorrências do menu config.
- `src/components/finance/BillsToPay.tsx` — adicionar sub-aba Recorrências.
- `src/components/finance/CategoriesManager.tsx` — campo meta inline.
- `src/components/finance/TransactionDialog.tsx` — UX repensada.
- `src/components/finance/AccountsManager.tsx` — fluxo simples de nova conta.
- `src/pages/SettingsPage.tsx` — remover entradas que migraram.

**Arquivos criados:**
- `src/components/finance/CategoryBudgets.tsx` — nova visão "Por Categoria" com metas.
- `src/components/agenda/RecurrencesPanel.tsx` — recorrências dentro da Agenda.

**Migrações Supabase:**
1. `ALTER TABLE fin_categories ADD COLUMN monthly_budget NUMERIC;`
2. `ALTER TABLE items ADD COLUMN origin TEXT DEFAULT 'manual';`

**Fora de escopo desta rodada:**
- Conciliação bancária / Open Finance.
- Previsão de saldo futuro com IA.
- Voltar PJ (volta em fase futura quando pedido).
- Categorização automática de despesas via IA (pode entrar numa próxima).

Posso seguir?
