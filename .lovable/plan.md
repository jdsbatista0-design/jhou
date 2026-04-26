# Simplificar Financeiro: recorrência embutida + pagamento óbvio

## Problemas atuais

1. **Recorrência confusa**: Existe uma aba separada "Recorrências" que duplica conceito. O usuário não quer gerenciar "regras" separadas — quer só marcar **"se repete todo mês"** dentro do próprio lançamento.
2. **Confirmação de pagamento invisível**: Os lançamentos previstos têm um pequeno ícone ✓ cinza no canto direito que quase ninguém vê. Deveria ser um botão grande, claro, com texto "Pagar".
3. **Didática fraca**: A aba abre em "Resumo" e o usuário não entende o fluxo. Faltam textos guia, agrupamento por "este mês / próximos / atrasados", e ações rápidas.

## O que vai mudar

### 1. Recorrência vira um campo do lançamento

- **Remover a aba "Recorrências"** do menu da aba Financeiro.
- A regra de recorrência continua existindo no banco (necessária pra gerar as ocorrências futuras automaticamente), mas o usuário **não vê mais essa abstração**. Ela é criada/editada/excluída automaticamente ao mexer no lançamento.
- No diálogo "Novo lançamento" / "Editar lançamento", o switch **"🔁 Se repete todo mês"** já existe — vai virar mais visível e ser o único lugar onde se mexe nisso.
- Ao **editar uma ocorrência recorrente**, em vez de mostrar o painel amarelo "Pausar regra / Encerrar regra / Excluir esta e futuras", mostrar opções diretas e claras:
  - **Salvar só esta** (default)
  - **Salvar esta e as próximas** (atualiza a regra também)
  - **Parar de repetir** (encerra a regra hoje, mantém as ocorrências passadas)

### 2. Botão "Pagar" grande e claro nos lançamentos previstos

Em `TransactionsList.tsx`, hoje o botão de confirmar é um ícone `Check` 14px cinza no canto. Vai virar:

- Um **botão pill verde com texto "Pagar"** (ou "Receber" se for entrada), só visível em lançamentos com status `pending`.
- Ao clicar, marca como `confirmed` e mostra toast "Pago em [hoje]".
- O ícone amarelo de relógio (Clock) ao lado do nome continua, pra sinalizar visualmente que é previsto.

### 3. Reorganização e didática

- **Renomear navegação interna**:
  - "Resumo" → fica
  - "Lançamentos" → **"Movimentações"**
  - "Recorrências" → **REMOVIDA**
  - Demais (Contas, Cartões, Categorias, Pessoas, Empresas) ficam, mas movidas pra um menu "⚙ Configurações" expansível, pra desafogar o topo.
- **Topo das Movimentações** ganha 3 chips de filtro rápido em vez de só selects:
  - **A pagar este mês** (badge com a soma R$ dos pendings do mês)
  - **Pagas / recebidas**
  - **Tudo**
- **Agrupar lançamentos** por: **Atrasadas** (data passada + status pending, em vermelho), **Esta semana**, **Este mês**, **Próximas**.
- Texto vazio mais útil quando não há nada: "Nenhuma movimentação ainda. Toque em **+ Novo lançamento** e marque **🔁 Se repete todo mês** se for um pagamento fixo (aluguel, salário, plano)."

### 4. Mover "Recorrências" pra dentro do lançamento (não some, fica didático)

Quando o usuário tá editando um lançamento que **não é recorrente** ainda, o switch "🔁 Se repete todo mês" cria a regra. Quando tá editando uma ocorrência **já recorrente**, o switch aparece marcado e o texto explica "Este lançamento se repete todo mês desde 03/2024 — mexer aqui altera só esta ocorrência."

## Arquivos afetados

- `src/pages/FinancePage.tsx` — remover seção `recurrences`, agrupar config menus, default em "Movimentações"
- `src/components/finance/TransactionsList.tsx` — botão "Pagar" grande, agrupamento por período, chips de filtro
- `src/components/finance/TransactionDialog.tsx` — simplificar painel de edição recorrente (3 botões claros), destacar switch de repetição
- **Manter**: `RecurrencesManager.tsx` no código (não usado mais no menu, mas seguro pra não quebrar nada caso seja referenciado)
- **Banco**: nenhuma mudança de schema. A tabela `fin_recurrences` continua existindo, só não é mais exposta como "aba".

## O que NÃO vai mudar

- Como a recorrência é gerada no backend (continua o mesmo job que cria as ocorrências futuras pendentes).
- Resumo (overview), gráficos, contas, cartões.
- Lançamentos já existentes — todos preservados.

Depois que aprovar, eu implemento.