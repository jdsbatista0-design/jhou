import { useMemo, useState } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, ChevronDown, Archive, MoreHorizontal, Clock, User, Zap, MessageCircle, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { differenceInCalendarDays } from 'date-fns';

const FASE_COLORS: Record<string, string> = {
  'Inbox': 'bg-muted-foreground/50',
  'Em andamento': 'bg-blue-500',
  'Aguardando': 'bg-amber-500',
  'Travado': 'bg-red-500',
  'Concluído': 'bg-emerald-500',
  'Arquivado': 'bg-muted-foreground/30',
};

const HIDDEN_BY_DEFAULT = new Set(['Concluído', 'Arquivado']);

function daysAgo(iso: string) {
  const d = differenceInCalendarDays(new Date(), new Date(iso));
  if (d <= 0) return 'hoje';
  if (d === 1) return '1d';
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mês`;
}

export default function InboxList() {
  const { items, settings, updateItem, deleteItem, setPriority, dailyPriorities } = useCentral();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['Concluído', 'Arquivado']));
  const [showHidden, setShowHidden] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (i.recurrenceId || i.origin === 'recurrence') return false;
      if (areaFilter && i.area !== areaFilter) return false;
      if (priorityFilter && i.priority !== priorityFilter) return false;
      return true;
    });
  }, [items, areaFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const f of settings.fases) map[f] = [];
    for (const it of filtered) {
      if (!map[it.fase]) map[it.fase] = [];
      map[it.fase].push(it);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return map;
  }, [filtered, settings.fases]);

  const visibleFases = useMemo(
    () => settings.fases.filter(f => showHidden || !HIDDEN_BY_DEFAULT.has(f)),
    [settings.fases, showHidden],
  );

  const toggleCollapse = (fase: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(fase)) next.delete(fase);
      else next.add(fase);
      return next;
    });
  };

  const conclude = (item: Item) => {
    updateItem(item.id, { fase: 'Concluído', previousFase: item.fase });
    toast.success('Concluído');
  };

  const archive = (item: Item) => {
    updateItem(item.id, { fase: 'Arquivado', previousFase: item.fase });
    toast.success('Arquivado');
  };

  const moveTo = (item: Item, fase: string) => {
    updateItem(item.id, { fase, previousFase: item.fase });
    toast.success(`Movido para "${fase}"`);
    setSheet(null);
  };

  const promoteToPriority = async (item: Item) => {
    const used = new Set(dailyPriorities.map(p => p.slot));
    const free = ([1, 2, 3] as const).find(s => !used.has(s));
    if (!free) {
      toast.error('3 slots já cheios');
      return;
    }
    await setPriority(free, item.id);
    toast.success(`Prioridade ${free}`);
    setSheet(null);
  };

  const activeFilters = (areaFilter ? 1 : 0) + (priorityFilter ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 -mx-4 px-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
          <Filter className="h-3 w-3" />
        </div>
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'alta' ? null : 'alta')}
          className={cn(
            'flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors',
            priorityFilter === 'alta' ? 'bg-red-500/15 border-red-500/40 text-red-500' : 'border-surface-2 text-muted-foreground',
          )}
        >
          Alta
        </button>
        {settings.areas.slice(0, 6).map(a => (
          <button
            key={a}
            onClick={() => setAreaFilter(areaFilter === a ? null : a)}
            className={cn(
              'flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors',
              areaFilter === a ? 'bg-primary/15 border-primary/40 text-primary' : 'border-surface-2 text-muted-foreground',
            )}
          >
            {a}
          </button>
        ))}
        <button
          onClick={() => setShowHidden(v => !v)}
          className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-surface-2 text-muted-foreground ml-auto"
        >
          {showHidden ? 'Ocultar arquivados' : 'Ver arquivados'}
        </button>
      </div>

      {/* Grouped sections */}
      <div className="space-y-2">
        {visibleFases.map(fase => {
          const list = grouped[fase] || [];
          if (list.length === 0 && !HIDDEN_BY_DEFAULT.has(fase)) return null;
          const isCollapsed = collapsed.has(fase);
          return (
            <div key={fase} className="rounded-xl border border-surface-2 bg-surface overflow-hidden">
              <button
                onClick={() => toggleCollapse(fase)}
                className="w-full flex items-center gap-2 px-3 py-2.5"
              >
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', FASE_COLORS[fase] || 'bg-muted-foreground/30')} />
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{fase}</span>
                <span className="text-[10px] text-muted-foreground" data-mono>{list.length}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform', isCollapsed && '-rotate-90')} />
              </button>

              {!isCollapsed && list.length > 0 && (
                <div className="divide-y divide-surface-2">
                  {list.map(item => {
                    const overdue = item.deadline && item.deadline < new Date().toISOString().slice(0, 10);
                    return (
                      <div key={item.id} className="flex items-center gap-2 pl-3 pr-1 py-2">
                        <button
                          onClick={() => conclude(item)}
                          className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500 flex items-center justify-center flex-shrink-0 transition-colors text-transparent"
                          aria-label="Concluir"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/item/${item.id}`)}
                          className="flex-1 min-w-0 text-left py-1"
                        >
                          <div className="text-sm text-foreground truncate leading-snug">{item.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                            <span>{item.area}</span>
                            {item.priority === 'alta' && <span className="text-red-500">·  alta</span>}
                            {item.person && <span className="inline-flex items-center gap-0.5">· <User className="h-2.5 w-2.5" />{item.person}</span>}
                            {item.deadline && <span className={cn('inline-flex items-center gap-0.5', overdue && 'text-red-500 font-medium')}>· <Clock className="h-2.5 w-2.5" />{item.deadline.slice(5).replace('-', '/')}{item.deadlineTime ? ` ${item.deadlineTime}` : ''}</span>}
                            <span className="ml-auto" data-mono>{daysAgo(item.updatedAt)}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setSheet(item)}
                          className="h-8 w-8 rounded-full hover:bg-surface-2 flex items-center justify-center flex-shrink-0 text-muted-foreground"
                          aria-label="Mais ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isCollapsed && list.length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-3">vazio</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions bottom sheet */}
      <Sheet open={!!sheet} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {sheet && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-base">{sheet.title}</SheetTitle>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary" className="text-[10px]">{sheet.fase}</Badge>
                  <Badge variant="outline" className="text-[10px]">{sheet.area}</Badge>
                  {sheet.priority && <Badge variant="outline" className="text-[10px]">{sheet.priority}</Badge>}
                </div>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Ações rápidas</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="h-11 justify-start" onClick={() => { conclude(sheet); setSheet(null); }}>
                      <Check className="h-4 w-4 mr-2 text-emerald-500" /> Concluir
                    </Button>
                    <Button variant="secondary" className="h-11 justify-start" onClick={() => promoteToPriority(sheet)}>
                      <Zap className="h-4 w-4 mr-2 text-primary" /> Priorizar hoje
                    </Button>
                    <Button variant="secondary" className="h-11 justify-start" onClick={() => { archive(sheet); setSheet(null); }}>
                      <Archive className="h-4 w-4 mr-2" /> Arquivar
                    </Button>
                    <Button variant="secondary" className="h-11 justify-start" onClick={() => { navigate(`/item/${sheet.id}`); setSheet(null); }}>
                      <MessageCircle className="h-4 w-4 mr-2" /> Abrir & comentar
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Mover para fase</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {settings.fases.filter(f => f !== sheet.fase).map(f => (
                      <button
                        key={f}
                        onClick={() => moveTo(sheet, f)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-surface-2 hover:border-primary text-sm text-left"
                      >
                        <span className={cn('h-2 w-2 rounded-full', FASE_COLORS[f] || 'bg-muted-foreground/30')} />
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Mudar área</div>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.areas.filter(a => a !== sheet.area).map(a => (
                      <button
                        key={a}
                        onClick={() => { updateItem(sheet.id, { area: a }); toast.success(`Área: ${a}`); setSheet(null); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-surface-2 hover:border-primary"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Excluir este item?')) {
                      deleteItem(sheet.id);
                      setSheet(null);
                      toast.success('Excluído');
                    }
                  }}
                >
                  Excluir item
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
