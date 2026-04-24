
# Aba Financeiro — Fase 1

Estrutura completa de finanças pessoais e empresariais com lançamentos 100% manuais nessa primeira rodada. Google Sheets (Fase 2) e Belvo / Open Finance (Fase 3) entram depois, sobre essa base.

Frota, imóveis, IPTU, IPVA, plano de saúde, escola das crianças, etc. são tratados como **categorias** dos lançamentos (decisão sua) — não vamos cadastrar carro a carro nessa fase.

---

## O que você vai ter ao final dessa entrega

### Nova aba "Finanças" (5ª aba na barra inferior)

Bottom nav passa de 4 para 5 abas: Início · Agenda · **Finanças** · Painel · Config.

Ao entrar, dois grandes botões/segmentos no topo: **Pessoa Física** | **Pessoa Jurídica**. Toda a navegação interna respeita o contexto escolhido (cada empresa PJ tem seus próprios dados isolados).

### Pessoa Física

- **Resumo do mês:** entradas, saídas, saldo, gasto previsto vs realizado.
- **Contas bancárias:** cadastrar nome, banco, tipo (corrente / poupança / investimento), saldo inicial. Saldo atual é calculado a partir dos lançamentos.
- **Cartões de crédito:** nome, bandeira, limite total, dia de fechamento, dia de vencimento, conta vinculada. Mostra fatura aberta, próxima fatura, % do limite usado.
- **Lançamentos:** entrada, saída, transferência entre contas, pagamento de fatura. Cada lançamento tem: descrição, valor, data, conta ou cartão, categoria, recorrência opcional, anexo opcional, observação.
- **Recorrências:** aluguel, água, luz, internet, plano de saúde, escola — geradas automaticamente todo mês na data definida (status "previsto" até você confirmar pagamento).
- **Contas a pagar / a receber:** lançamentos com data futura aparecem em duas listas dedicadas, ordenadas por vencimento, com alerta quando vencem em ≤ 3 dias.
- **Categorias customizáveis:** padrão sugerido (Alimentação, Transporte, Saúde, Educação, Lazer, Moradia, Frota, Imóveis, IPTU/IPVA, Viagens, Inesperados, Empréstimos…) e você adiciona / remove / renomeia em Config.

### Pessoa Jurídica

- **Cadastro de empresas:** nome, CNPJ opcional, cor identificadora. Adicionar, editar, arquivar (com confirmação porque tem lançamentos vinculados).
- **Seletor de empresa** no topo da seção PJ — todos os dados filtram pela empresa selecionada. Há também opção "Todas as empresas" para visão consolidada.
- **Contas bancárias e cartões** por empresa, mesmo modelo da PF.
- **Lançamentos PJ** com tipos extras: pagamento a funcionário, pagamento a fornecedor, empréstimo a funcionário, empréstimo bancário, imposto, conta a receber.
- **Cadastro de funcionários e fornecedores** (nome + observação), reutilizáveis em lançamentos como "pessoa".
- **Transferência entre empresas:** lançamento especial que cria saída em uma empresa e entrada em outra (vinculadas pelo mesmo `transfer_id`), para refletir aporte / empréstimo entre PJs.

### Dashboard financeiro (resumo)

Dentro de cada contexto (PF ou empresa PJ selecionada):

- Saldo total consolidado (soma das contas).
- Entradas vs saídas no mês corrente, com comparativo do mês anterior.
- Top categorias de gasto do mês.
- Gasto por cartão no período (qual cartão está concentrando alimentação, qual está concentrando frota, etc.).
- Próximos vencimentos (7 dias).

### Config (extensão da aba existente)

Nova seção "Finanças": gerenciar categorias PF, categorias PJ, listas de funcionários e fornecedores, empresas PJ.

---

## Detalhes técnicos

### Banco de dados (novas tabelas, todas com RLS `auth.uid() = user_id`)

- `fin_companies` — empresas PJ (id, user_id, name, cnpj, color, archived, created_at).
- `fin_accounts` — contas bancárias (id, user_id, scope `pf|pj`, company_id nullable, name, bank, type, initial_balance, archived).
- `fin_cards` — cartões (id, user_id, scope, company_id nullable, account_id, name, brand, limit_amount, closing_day, due_day, archived).
- `fin_categories` — categorias (id, user_id, scope, name, kind `income|expense|transfer`, color, archived).
- `fin_people` — funcionários e fornecedores PJ (id, user_id, company_id, name, role `employee|supplier|other`, note).
- `fin_transactions` — lançamentos (id, user_id, scope, company_id nullable, account_id nullable, card_id nullable, category_id, kind `income|expense|transfer|card_payment|invoice_payment`, amount, occurred_on, description, person_id nullable, recurrence_id nullable, transfer_id nullable, status `pending|confirmed`, attachment_url nullable, notes).
- `fin_recurrences` — modelos de lançamento recorrente (id, user_id, scope, company_id nullable, template fields, frequency `monthly|weekly|yearly`, day_of_month, start_on, end_on nullable, active).

Realtime ligado em todas as tabelas `fin_*`.

### Frontend

- Novo contexto `FinanceContext` separado do `CentralContext` para não inflar o atual.
- Páginas: `/financas` (overview com toggle PF/PJ) → `/financas/pf` e `/financas/pj` → sub-rotas para `contas`, `cartoes`, `lancamentos`, `recorrencias`, `a-pagar`, `a-receber`, `funcionarios`, `empresas`.
- Componentes reutilizáveis: `TransactionForm`, `TransactionList`, `AccountCard`, `CardSummary`, `CategoryPicker`, `CompanySelector`.
- BottomNav passa de 4 para 5 itens (ícone `Wallet` para Finanças).

### Geração de recorrências

Quando uma recorrência ativa existe, na primeira vez que o usuário abre a aba Finanças no mês corrente, geramos as parcelas faltantes daquele mês (status `pending`) e ele só confirma quando paga. Sem precisar de cron / edge function nessa fase.

### Cálculos

Saldo de conta = `initial_balance + Σ(entradas confirmadas) − Σ(saídas confirmadas) ± transferências`. Tudo derivado em memória a partir dos lançamentos — nada armazenado em cache que possa desincronizar.

Fatura do cartão = soma das despesas no cartão entre o último fechamento e o próximo, status confirmado.

---

## O que NÃO entra nessa fase (deixado explícito)

- **Belvo / Open Finance** — Fase 3, depende de você criar conta Belvo e fornecer credenciais.
- **Google Sheets** — Fase 2, faremos depois que validarmos a estrutura aqui.
- **Conciliação bancária** — depende de Belvo + Sheets, então também Fase 3.
- **Cadastro individual de carros / imóveis** — viram categorias por enquanto.
- **Anexos de comprovantes** — campo já fica no schema, mas a UI de upload entra numa próxima rodada se você priorizar.

---

Aprova pra eu começar a implementar?
