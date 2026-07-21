import { useMemo, useState } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Settings as SettingsIcon, Eye, EyeOff, Inbox as InboxIcon } from 'lucide-react';
import InboxEntryCard from '@/components/InboxEntryCard';

const FASE_COLORS: Record<string, string> = {
  'Inbox': 'border-muted-foreground/30',
  'Em andamento': 'border-blue-500/50',
  'Aguardando': 'border-amber-500/50',
  'Travado': 'border-red-500/50',
  'Concluído': 'border-emerald-500/50',
};

const HIDDEN_BY_DEFAULT = new Set(['Concluído', 'Arquivado']);

type GroupBy = 'fase' | 'area';

export default function InboxKanban() {
  const { items, inbox, settings, updateItem } = useCentral();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('fase');
  const [showHidden, setShowHidden] = useState(false);
  const [showCapturas, setShowCapturas] = useState(true);

  const capturas = useMemo(() => inbox.filter(e => e.status === 'pending'), [inbox]);

  const columns = useMemo(() => {
    return groupBy === 'fase' ? settings.fases : settings.areas;
  }, [groupBy, settings.fases, settings.areas]);

  const visibleColumns = useMemo(
    () => groupBy === 'fase'
      ? columns.filter(c => showHidden || !HIDDEN_BY_DEFAULT.has(c))
      : columns,
    [columns, groupBy, showHidden],
  );

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const c of columns) map[c] = [];
    // Recorrências vivem só na Agenda — não poluem o Kanban
    const filtered = items.filter(i => !i.recurrenceId && i.origin !== 'recurrence');
    for (const it of filtered) {
      const key = groupBy === 'fase' ? it.fase : it.area;
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }, [items, columns, groupBy]);

  const handleDrop = (col: string) => {
    if (!dragging) return;
    const item = items.find(i => i.id === dragging);
    if (item) {
      if (groupBy === 'fase' && item.fase !== col) {
        updateItem(dragging, {
          fase: col,
          previousFase: col === 'Concluído' ? item.fase : undefined,
        });
        toast.success(`Movido para "${col}"`);
      } else if (groupBy === 'area' && item.area !== col) {
        updateItem(dragging, { area: col });
        toast.success(`Área alterada para "${col}"`);
      }
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-3">
      {/* Header: group-by toggle + settings */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-surface rounded-chip p-0.5">
          {(['fase', 'area'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={cn(
                'tap-target text-xs px-3 rounded-chip transition-colors',
                groupBy === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {g === 'fase' ? 'Por fase' : 'Por área'}
            </button>
          ))}
        </div>
        {groupBy === 'fase' && (
          <button
            onClick={() => setShowHidden(v => !v)}
            className="tap-target text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Mostrar/ocultar Concluído e Arquivado"
          >
            {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showHidden ? 'Ocultar arquivados' : 'Ver concluídos'}
          </button>
        )}
      </div>

      {/* Capturas rendered at page level (InboxPage) */}

      {/* Kanban board */}
      <div className="-mx-4 px-4 overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-min">
          {visibleColumns.map(col => {
            const list = grouped[col] || [];
            const isOver = dragOver === col;
            return (
              <div
                key={col}
                onDragOver={e => { e.preventDefault(); setDragOver(col); }}
                onDragLeave={() => setDragOver(curr => (curr === col ? null : curr))}
                onDrop={() => handleDrop(col)}
                className={cn(
                  'w-[260px] shrink-0 bg-surface rounded-xl border border-surface-2 flex flex-col max-h-[70vh]',
                  isOver && 'border-primary ring-1 ring-primary',
                )}
              >
                <div className={cn(
                  'sticky top-0 z-10 px-3 py-2 flex items-center justify-between border-b border-surface-2 border-l-4 rounded-t-xl bg-surface',
                  groupBy === 'fase' ? (FASE_COLORS[col] || 'border-muted-foreground/30') : 'border-primary/40',
                )}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
                    {col}
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
                          {groupBy === 'fase' ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{item.area}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{item.fase}</Badge>
                          )}
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
                          value={groupBy === 'fase' ? item.fase : item.area}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            if (groupBy === 'fase') updateItem(item.id, { fase: e.target.value });
                            else updateItem(item.id, { area: e.target.value });
                            toast.success(`Movido para "${e.target.value}"`);
                          }}
                          className="w-full text-[10px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground"
                        >
                          {columns.map(f => (
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

      {items.length === 0 && capturas.length === 0 && (
        <div className="text-center py-12">
          <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" aria-hidden />
          <p className="text-sm font-medium text-foreground">Inbox vazio</p>
          <p className="text-xs text-muted-foreground mt-1">
            Toque no <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold align-middle">+</span> para capturar.
          </p>
        </div>
      )}
    </div>
  );
}
