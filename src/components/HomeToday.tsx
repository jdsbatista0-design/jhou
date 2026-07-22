import { useCentral } from '@/contexts/CentralContext';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item } from '@/types/central';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function HomeToday() {
  const { dailyPriorities, items, setPriority, removePriority, markPriorityDone, addItem, settings } = useCentral();
  const navigate = useNavigate();
  const [pickingSlot, setPickingSlot] = useState<1 | 2 | 3 | null>(null);
  const [customText, setCustomText] = useState('');
  const [creating, setCreating] = useState(false);

  const itemById = useMemo(() => {
    const m = new Map<string, Item>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const slots: (1 | 2 | 3)[] = [1, 2, 3];
  const slotMap = useMemo(() => {
    const m = new Map<number, { itemId: string; doneAt?: string; priorityId: string }>();
    for (const p of dailyPriorities) m.set(p.slot, { itemId: p.itemId, doneAt: p.doneAt, priorityId: p.id });
    return m;
  }, [dailyPriorities]);

  // Candidates for the picker: open items (not concluded, not recurring materialized)
  const candidates = useMemo(() => {
    const chosenIds = new Set(dailyPriorities.map(p => p.itemId));
    return items
      .filter(i => i.fase !== 'Concluído' && !i.recurrenceId && !chosenIds.has(i.id))
      .slice(0, 40);
  }, [items, dailyPriorities]);

  const closePicker = () => {
    setPickingSlot(null);
    setCustomText('');
  };

  const handlePick = async (itemId: string) => {
    if (!pickingSlot) return;
    await setPriority(pickingSlot, itemId);
    closePicker();
    toast.success(`Definido como prioridade ${pickingSlot}`);
  };

  const handleCreateCustom = async () => {
    const text = customText.trim();
    if (!text || !pickingSlot || creating) return;
    setCreating(true);
    try {
      const newId = await addItem({
        title: text,
        tipo: settings.tipos[0] || 'Ação',
        fase: 'Em andamento',
        area: settings.areas[0] || 'Pessoal',
        tags: [],
        kind: 'my_action',
        origin: 'manual',
      });
      if (newId) {
        await setPriority(pickingSlot, newId);
        toast.success(`Definido como prioridade ${pickingSlot}`);
        closePicker();
      } else {
        toast.error('Não foi possível criar');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-surface-2 bg-surface p-3">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Hoje — 3 prioridades</h2>
        </div>
        <div className="space-y-2">
          {slots.map(slot => {
            const p = slotMap.get(slot);
            const item = p ? itemById.get(p.itemId) : null;
            const isDone = !!p?.doneAt || item?.fase === 'Concluído';
            return (
              <div
                key={slot}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-surface-2 p-2 min-h-[56px]",
                  isDone && "opacity-50"
                )}
              >
                <button
                  onClick={() => p && markPriorityDone(slot)}
                  disabled={!p || isDone}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isDone ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent hover:border-primary hover:text-primary"
                  )}
                  aria-label={`Concluir prioridade ${slot}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="text-xs font-bold text-muted-foreground w-4">{slot}</div>
                {item ? (
                  <button
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className={cn("text-sm font-medium text-foreground truncate", isDone && "line-through")}>
                      {item.title}
                    </div>
                    {item.area && <div className="text-xs text-muted-foreground truncate">{item.area}</div>}
                  </button>
                ) : (
                  <button
                    onClick={() => setPickingSlot(slot)}
                    className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Escolher prioridade
                  </button>
                )}
                {p && (
                  <button
                    onClick={() => removePriority(slot)}
                    className="h-8 w-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-muted-foreground flex-shrink-0"
                    aria-label="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={pickingSlot !== null} onOpenChange={(open) => !open && closePicker()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prioridade {pickingSlot}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Escrever prioridade…"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateCustom(); }
                }}
              />
              <Button onClick={handleCreateCustom} disabled={!customText.trim() || creating}>
                Adicionar
              </Button>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground pt-1">
              ou escolher item existente
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-1">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item aberto disponível.</p>
              ) : (
                candidates.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handlePick(item.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-surface-2 transition-colors border border-transparent hover:border-surface-2"
                  >
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.area} · {item.fase}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
