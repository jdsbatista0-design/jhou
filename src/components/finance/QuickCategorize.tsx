import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';
import { toast } from 'sonner';

/** Uma compra sem categoria por vez; um toque classifica e passa para a próxima. */
export function QuickCategorize({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getUncategorized, categories, updateTransaction, cards } = useFinance();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => getUncategorized().transactions.filter(t => !skipped.has(t.id)), [getUncategorized, skipped]);
  const cats = useMemo(() => categories.filter(c => c.kind === 'expense' && !c.archived).sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const cur = list[0];
  const cardName = cur?.cardId ? cards.find(c => c.id === cur.cardId)?.name : null;

  const pick = async (categoryId: string) => {
    if (!cur || busy) return;
    setBusy(true);
    try {
      await updateTransaction(cur.id, { categoryId });
      // Mesmo estabelecimento em outras compras sem categoria: classifica junto
      const key = cur.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').toLowerCase();
      const same = list.slice(1).filter(t => t.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').toLowerCase() === key);
      for (const t of same) await updateTransaction(t.id, { categoryId });
      if (same.length) toast.success(`+${same.length} compras iguais classificadas`);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-10">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-lg">Classificar compras</SheetTitle>
          <p className="text-xs text-muted-foreground">{list.length} sem categoria</p>
        </SheetHeader>
        {!cur ? (
          <div className="py-10 text-center space-y-3">
            <p className="font-display text-lg">Tudo classificado.</p>
            <Button onClick={onClose} className="h-12 rounded-2xl px-8">Fechar</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="rounded-2xl bg-surface-2 p-5">
              <p className="text-sm text-muted-foreground">{new Date(cur.occurredOn + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}{cardName ? ` · ${cardName}` : ''}</p>
              <p className="font-display text-xl font-semibold mt-1 break-words">{cur.description}</p>
              <p className="font-display text-2xl font-bold mt-2" data-mono>{formatBRL(cur.amount)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c.id} disabled={busy} onClick={() => pick(c.id)}
                  className="min-h-12 px-4 rounded-full border border-border bg-card text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                  {c.name}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full h-12" onClick={() => setSkipped(s => new Set(s).add(cur.id))}>Pular esta</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
