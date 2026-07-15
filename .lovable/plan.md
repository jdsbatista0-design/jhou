## Problema

1. **Duplicatas de recorrências**: Moove e Pilates aparecem 2x no mesmo horário. A materialização gerou itens duplicados (provavelmente rodou várias vezes sem checar existência por `recurrenceId + data`).
2. **Excluir/editar não afeta a série**: hoje ao excluir um item recorrente, os outros continuam. Falta lógica estilo Google Agenda (só este / este e próximos / toda a série).
3. **Botão de excluir minúsculo**: ícone lixeira 3.5 (14px), ruim de acertar no mobile, ainda mais em série.

## Plano

### 1. Limpar duplicatas existentes (one-shot)
No `CentralContext`, ao carregar `items`, detectar duplicatas por chave `recurrenceId + date + time` e apagar as excedentes (mantém a mais antiga). Roda uma vez por sessão.

### 2. Prevenir duplicatas na materialização (`src/lib/recurrence.ts` + Central)
Antes de inserir ocorrências, montar Set das chaves já existentes (`recurrenceId|YYYY-MM-DD|HH:mm`) e pular as que já existem. Atualizar `lastMaterializedUntil` só depois.

### 3. Editar/Excluir estilo Google Agenda
Ao clicar em Excluir num item com `recurrenceId`, abrir diálogo com 3 opções:
- **Só este** — apaga só o item selecionado
- **Este e os próximos** — apaga o selecionado + futuros da mesma série; ajusta `endDate` da recorrência para o dia anterior
- **Toda a série** — apaga a recorrência + todos os itens vinculados (usa `deleteRecurrence(id, true)` existente)

Mesma lógica ao editar campos "estruturais" (título, hora, dia da semana): "Só este" edita o item; "Este e próximos" cria nova recorrência a partir da data e encerra a antiga; "Todos" edita a recorrência (e replica nas ocorrências futuras).

Nesta primeira entrega: implementar o **fluxo de exclusão** completo + edição "Só este" (via ItemDetail já existente). Edição "este e próximos"/"todos" fica como próximo passo (aviso no diálogo).

### 4. UX do botão excluir
- Aumentar alvo de toque para 44x44px (`h-11 w-11`) nos cards da Agenda.
- Em vez de lixeira solta, adicionar botão "Excluir" com ícone + label quando o card está em modo lista, com confirmação inline.
- Já que abre AlertDialog, evitar `e.stopPropagation` engolir clique.

## Arquivos afetados

- `src/contexts/CentralContext.tsx` — dedupe on load, guard na materialização, novo método `deleteRecurringItem(itemId, scope: 'one' | 'future' | 'all')`.
- `src/pages/AgendaPage.tsx` — botão excluir maior; abrir dialog de escopo quando `entry.item.recurrenceId` existe.
- `src/pages/ItemDetail.tsx` — mesmo dialog no botão excluir do detalhe.
- (sem migração de DB)

## Fora do escopo agora
- Edição "este e próximos" / "todos" com reescrita da série (fica para próxima etapa; hoje o usuário edita a recorrência inteira pela aba Recorrentes).
