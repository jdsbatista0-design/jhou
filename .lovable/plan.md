## Recorrência mensal no lançamento

A ideia: ao criar um lançamento, marcar **"se repete todo mês"** e o sistema cuida de gerar as próximas ocorrências sozinho. A tabela `fin_recurrences` já existe no banco, só falta plugar a UI e a lógica.

---

### O que vai mudar na tela

**No diálogo de Novo lançamento** (já tem valor, data, descrição, conta, categoria):

Adiciono um bloco "Repetir":
- Toggle **"Se repete todo mês"** — desligado por padrão
- Quando ligado, aparecem 2 campos curtos:
  - **Frequência**: Mensal (padrão) · Semanal · Anual
  - **Até quando**: "Sem fim" (padrão) · escolher data
- O dia do mês é pego automaticamente da data do lançamento (se você lançou dia 5, a recorrência é todo dia 5)

**Status padrão das próximas ocorrências**: serão criadas como **"Previsto"** (com o relógio âmbar), e você marca como pago clicando no ✓ — exatamente como já funciona hoje pros pendentes. Isso é o que faz mais sentido pra "conta a pagar todo mês".

**No banner de edição** (que já mostra "Lançamento recorrente"):
- Adiciono botão **"Editar regra"** → abre um diálogo pra pausar/encerrar a recorrência ou mudar valor/dia que vale daqui pra frente
- Adiciono botão **"Excluir só esta"** vs **"Excluir esta e as futuras"**

**Numa nova mini-seção "Recorrências"** dentro de Finanças (aba Categorias já tem precedente):
- Lista das recorrências ativas (ex.: "Aluguel · R$ 2.500 · todo dia 5 · ativa")
- Botão pra pausar, encerrar ou editar cada uma

---

### Como a geração automática funciona

Quando você abre a aba Finanças, o sistema roda uma rotina silenciosa:

1. Lê todas as recorrências ativas
2. Pra cada uma, calcula quais ocorrências deveriam existir entre `start_on` e **hoje + 1 mês** (gera o do mês corrente e já adianta o do próximo mês — aparece como "Previsto" pra você ver no caixa)
3. Compara com `last_generated_on` da recorrência pra não duplicar
4. Insere as `fin_transactions` que faltam, vinculadas via `recurrence_id`
5. Atualiza `last_generated_on`

Tudo client-side, sem precisar de cron/edge function nessa fase. Roda só quando você abre Finanças.

---

### Detalhes técnicos

**`src/contexts/FinanceContext.tsx`**
- Adicionar CRUD: `addRecurrence`, `updateRecurrence`, `deleteRecurrence`, `pauseRecurrence`
- Adicionar `generatePendingRecurrences()` que calcula ocorrências faltantes baseado em `frequency`, `day_of_month`, `last_generated_on`
- Chamar essa função no `useEffect` inicial, depois do `refreshAll()`
- Helper `deleteTransactionAndFuture(id)` que apaga a ocorrência atual + as futuras da mesma `recurrence_id` com `occurred_on >= ?`

**`src/components/finance/TransactionDialog.tsx`**
- Bloco novo "Repetir" com Switch + Select de frequência + date picker opcional de fim
- No `handleSave` (modo create): se toggle ligado, primeiro cria a recorrência, depois usa o `id` retornado como `recurrenceId` no insert do primeiro lançamento e seta `status: 'pending'` (a menos que data ≤ hoje, aí confirma)
- No modo edit, manter o banner "Lançamento recorrente" e adicionar os botões "Editar regra" / "Excluir esta e futuras"

**`src/components/finance/RecurrencesManager.tsx`** (novo)
- Lista as `recurrences` ativas/pausadas
- Cada linha: descrição, valor, dia do mês, status, conta/categoria
- Ações: pausar (toggle `active`), encerrar (set `end_on = hoje`), editar valor/dia, excluir (com aviso de quantas ocorrências futuras serão removidas)

**`src/pages/FinancePage.tsx`**
- Adicionar `'recurrences'` no array `sections` com ícone `Repeat`

**Lógica da geração (resumida):**
```
para cada recurrence ativa:
  cursor = last_generated_on || start_on
  até cursor < hoje + 30 dias:
    cursor = próximo vencimento (segundo frequency)
    se cursor > end_on: para
    se já existe transaction com (recurrence_id, occurred_on=cursor): pula
    insere transaction (status = cursor <= hoje ? 'pending' : 'pending')
  atualiza last_generated_on = cursor
```

Status sempre `'pending'` mesmo pras passadas: assim você vê quais não pagou ainda e marca uma a uma com o ✓ — alinhado com o que o app já faz hoje.

---

### O que **não** está nesse plano

- Notificação de vencimento (vira fase 2 junto com o módulo de Agenda)
- "Pagar todas de uma vez" em lote (dá pra adicionar depois se virar incômodo)
- Recorrência de transferências entre contas (só income/expense por enquanto, que é 99% dos casos)

---

**Posso implementar?**