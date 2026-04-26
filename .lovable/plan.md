## Unificar os dois "Inbox" em um só

Hoje há duas caixas com o mesmo nome:
- **Capturas brutas** (tabela `inbox_entries`) — o que entra pelo `+`/WhatsApp
- **Items na fase "Inbox"** (coluna `items.fase = 'Inbox'`) — Items já criados mas sem triagem

Vamos juntar tudo numa **única Inbox** visível no Início e no Painel, com o mesmo número em todo lugar.

---

## Como vai funcionar

### Regra única
**Inbox = tudo que ainda precisa ser triado**, vindo de duas origens, mas exibido junto:
1. Capturas brutas pendentes (`inbox_entries.status = 'pending'`)
2. Items na fase `Inbox` (`items.fase = 'Inbox'`)

### Onde aparece
| Lugar | Antes | Depois |
|---|---|---|
| Story "Inbox" no Início | 0 (só capturas) | 13 (capturas + Items na fase Inbox) |
| Chip "Inbox" no Painel "Por fase" | 13 (só Items) | 13 (mesma conta) |
| Página `/inbox` | só capturas | capturas + Items na fase Inbox |

Os números **vão bater em todas as telas**.

### Triagem (o que você faz com cada um)
- **Captura bruta** → botões "Virar Item" / "Virar Memória" / "Arquivar" (já existem)
- **Item na fase Inbox** → abre o Item, muda fase para "Em andamento" / "Aguardando" / etc. (fluxo normal)

---

## O que muda no código

**3 arquivos editados, sem migração de dados, sem mudança de schema:**

### 1. `src/components/DashboardStories.tsx`
Story "Inbox" passa a somar e exibir as duas origens:

```ts
const inboxItems = useMemo(
  () => sortItems(filteredItemsAll.filter(i => i.fase === 'Inbox')),
  [filteredItemsAll, sortKey]
);

inbox: {
  count: pendingInbox.length + inboxItems.length,
  render: () => (
    <div className="space-y-2">
      {pendingInbox.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Capturas a triar
          </p>
          {pendingInbox.map(e => <InboxEntryCard key={e.id} entry={e} />)}
        </>
      )}
      {inboxItems.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Itens sem fase
          </p>
          {inboxItems.map(i => <ItemCard key={i.id} item={i} />)}
        </>
      )}
    </div>
  ),
}
```

### 2. `src/pages/InboxPage.tsx`
Mesma lógica: mostra capturas + Items na fase Inbox em duas seções.

### 3. `src/components/DashboardStories.tsx` (mesmo arquivo)
Remover o Item da fase "Inbox" da story **"Em andamento"** caso esteja vazando — manter cada Item em **uma única story** (Inbox OU Em andamento OU Aguardando…), nunca em duas.

---

## O que NÃO muda
- Tabelas `inbox_entries` e `items` continuam separadas (origens diferentes têm comportamentos diferentes na triagem).
- A fase `Inbox` continua existindo nos Items (necessária para WhatsApp/IA criar Items que caem direto na triagem).
- `ReportsPage`, `AgendaPage`, `InboxEntryCard`, contexto: nada muda.
- Zero risco de perda de dados.

---

## Resultado

- Um único contador de "Inbox" em todo o app.
- Você abre o Início ou o Painel e vê o **mesmo 13** (no seu caso atual).
- Triagem fica óbvia: capturas viram Items, Items mudam de fase.