# Refatoração completa do Central

Objetivo: menos campos, telas mais fáceis de ler no celular, e uma separação clara entre as contas fixas do mês e o mundo do cartão de crédito.

## 1. Nova navegação

Hoje tudo de finanças vive numa página só, com muitas abas por dentro. Passa a ser:

```text
Agenda   Contas   Cartões   Rotinas   Ajustes
```

- **Contas**: o que você paga do mês (fixas, boletos, recorrentes) + saldo das contas.
- **Cartões**: tudo do cartão junto num lugar — fatura do mês, vencimento, compras, parcelas, próximos meses e importar fatura.
- As duas nunca se misturam: compras de cartão não aparecem em Contas, e contas fixas não aparecem na fatura. Em Contas você vê apenas uma linha por cartão: "Fatura C6 — R$ X — vence dia 10".

## 2. Lançar e pagar (o que mais incomoda)

Um único formulário curto, que se adapta ao que você escolhe:

- Campos visíveis: **valor, descrição, data, categoria** e **de onde saiu** (conta ou cartão).
- Nota opcional escondida atrás de "mais".
- Removidos: ajuste manual de fatura, empresa/PJ, pessoas, anexo, tipo de conta, transferência interna avulsa e campos duplicados de parcela.
- Parcelamento vira um controle só: "parcelado em ___ vezes".
- Pagar: botão em cada conta e em cada fatura, já com valor e data preenchidos; um toque confirma.
- Teclado numérico e máscara em reais em todo campo de valor.

O "ajuste de fatura" sai de vez — a importação de fatura passa a ser a forma oficial de fechar o valor, e os R$ 10.650 lançados como ajuste ficam marcados para você reclassificar ou apagar numa tela de limpeza.

## 3. Tela de Cartões

- Topo: cartão atual com fatura do mês, quanto falta pagar e o vencimento.
- Navegação por mês, para frente e para trás.
- Lista de compras da fatura agrupada por categoria, com parcelas marcadas (3/10) e "acaba em X".
- Próximos 6 meses já comprometidos.
- Botões grandes: **Lançar gasto**, **Pagar fatura**, **Importar fatura (PDF)**.

## 4. Contas

- "Vence hoje / esta semana / este mês / atrasado", nessa ordem.
- Cada linha: nome, valor, dia, e um toque para pagar.
- Recorrentes fixas com selo de repetição, sem virar item novo a cada mês.
- Resumo no topo: quanto entra, quanto sai, o que sobra.

## 5. Agenda e Rotinas

- Agenda: dia e semana mais limpos, com compromissos, prazos e vencimentos, sem repetição.
- Criar compromisso em duas toques, com campos mínimos.
- Rotinas: editar dia, hora e repetição na mesma tela, sem sumir da Agenda.

## 6. Limpeza geral

- Telas e botões que não levam a nada são removidos (Painel, Relatórios antigos, gestão de empresas e pessoas).
- Um só caminho para cada ação — nada de editar cartão em dois lugares.
- Cada tela abre rápido, sem piscar.

## Visual

Antes de aplicar, vou te mostrar **3 direções visuais** para escolher (cores, tipografia e composição). A escolhida vira o padrão de todo o sistema.

## Detalhes técnicos

- Tokens de cor/tipografia redefinidos em `index.css` e `tailwind.config.ts`; nada de cor fixa nos componentes.
- Rotas: `/agenda`, `/contas`, `/cartoes`, `/rotinas`, `/ajustes`. `/financas` redireciona para `/contas`.
- `FinancePage` é dividida em `BillsPage` (contas) e `CardsPage` (cartões); `BillsToPay` deixa de gerar linhas de compras de cartão e passa a listar somente recorrentes/boletos + uma virtual por fatura.
- `TransactionDialog` (679 linhas) reescrito como formulário enxuto com modos gasto / receita / pagamento de fatura; campos `companyId`, `personId`, `attachmentUrl`, `scope` deixam de ser expostos na UI (colunas permanecem no banco, sem migração destrutiva).
- `CardsDashboard`, `CardsOverview`, `CardStatement`, `CardDetailSheet`, `CardsForecast`, `CardsTopCategories` consolidados em `CardsPage` + duas seções.
- `ReportsPage`, `Dashboard`, `CompaniesManager`, `PeopleManager`, `HomeToday/HomeAgora/HomePending` removidos.
- Sem mudança de schema; nenhum dado apagado sem sua confirmação.
