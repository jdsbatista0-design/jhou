import { useMemo, useState } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

const FASE_COLORS: Record<string, string> = {
  'Inbox': 'border-muted-foreground/30',
  'Em andamento': 'border-blue-500/50',
  'Aguardando': 'border-amber-500/50',
  'Travado': 'border-red-500/50',
  'Concluído': 'border-emerald-500/50',
};

export default function InboxKanban() {
  const { items, settings, updateItem } = useCentral();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const f of settings.fases) map[f] = [];
    for (const it of items) {
      if (map[it.fase]) map[it.fase].push(it);
      else (map[it.fase] = [it]);
    }
    return map;
  }, [items, settings.fases]);

  const handleDrop = (fase: string) => {
    if (!dragging) return;
    const item = items.find(i => i.id === dragging);
    if (item && item.fase !== fase) {
      updateItem(dragging, {
        fase,
        previousFase: fase === 'Concluído' ? item.fase : undefined,
      });
      toast.success(`Movido para "${fase}"`);
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="-mx-4 px-4 overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-min">
        {settings.fases.map(fase => {
          const list = grouped[fase] || [];
          const isOver = dragOver === fase;
          return (
            <div
              key={fase}
              onDragOver={e => { e.preventDefault(); setDragOver(fase); }}
              onDragLeave={() => setDragOver(curr => (curr === fase ? null : curr))}
              onDrop={() => handleDrop(fase)}
              className={cn(
                'w-[260px] shrink-0 bg-surface rounded-xl border border-surface-2 flex flex-col max-h-[70vh]',
                isOver && 'border-primary ring-1 ring-primary',
              )}
            >
              <div className={cn(
                'sticky top-0 z-10 px-3 py-2 flex items-center justify-between border-b border-surface-2 border-l-4 rounded-t-xl bg-surface',
                FASE_COLORS[fase] || 'border-muted-foreground/30',
              )}>
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {fase}
                </span>
                <span className="text-[10px] text-muted-foreground" data-mono>{list.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {list.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-6">vazio</p>
                ) : (
                  list.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragging(item.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => navigate(`/items/${item.id}`)}
                      className={cn(
                        'bg-card border border-border rounded-lg p-2.5 cursor-pointer hover:border-primary/40 transition-colors space-y-1.5',
                        dragging === item.id && 'opacity-50',
                      )}
                    >
                      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{item.area}</Badge>
                        {item.priority && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.priority}</Badge>
                        )}
                        {item.comments?.length > 0 && (
                          <span className="text-[9px] text-muted-foreground inline-flex items-center gap-0.5">
                            <MessageCircle className="h-2.5 w-2.5" />{item.comments.length}
                          </span>
                        )}
                      </div>
                      <select
                        value={item.fase}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          updateItem(item.id, { fase: e.target.value });
                          toast.success(`Movido para "${e.target.value}"`);
                        }}
                        className="w-full text-[10px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground"
                      >
                        {settings.fases.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
