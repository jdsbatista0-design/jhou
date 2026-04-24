import { useRef, useState, useEffect, useMemo } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { isToday, isPast, format, isThisWeek, isThisMonth } from 'date-fns';
import ItemCard from './ItemCard';
import InboxEntryCard from './InboxEntryCard';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Inbox, AlarmClock, Flame, Ban, Rocket, Sparkles, Check, GripVertical, ArrowUpDown, Search } from 'lucide-react';
import { parseLocalDateTime } from '@/lib/dates';
import { toast } from 'sonner';
import { Item } from '@/types/central';

type PeriodFilter = 'hoje' | 'semana' | 'mes' | 'vencidos';
type SortKey = 'data-asc' | 'data-desc' | 'prioridade';

interface StoryDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  accent: string;
  empty: { emoji: string; text: string };
  render: () => React.ReactNode;
}

const STORY_KEYS = ['agora', 'urgentes', 'inbox', 'em-andamento', 'travado'] as const;
const ORDER_STORAGE_KEY = 'central_dashboard_story_order';

const PRIORITY_RANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

function loadStoryOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [...STORY_KEYS];
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter(k => (STORY_KEYS as readonly string[]).includes(k));
    const missing = STORY_KEYS.filter(k => !valid.includes(k));
    return [...valid, ...missing];
  } catch {
    return [...STORY_KEYS];
  }
}

export default function DashboardStories() {
  const { items, agendaEntries, inbox, updateItem, deleteEvent, settings } = useCentral();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const safeDate = (value?: string) => parseLocalDateTime(value) || (value ? new Date(value) : null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterFase, setFilterFase] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('data-asc');

  // Story order with drag
  const [storyOrder, setStoryOrder] = useState<string[]>(loadStoryOrder);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(storyOrder));
  }, [storyOrder]);

  const visibleFases = settings.fases.filter(f => f !== 'Concluído');

  const matchesPeriod = (deadline?: string) => {
    if (!filterPeriod) return true;
    const d = safeDate(deadline);
    if (!d) return false;
    if (filterPeriod === 'hoje') return isToday(d);
    if (filterPeriod === 'semana') return isThisWeek(d, { weekStartsOn: 1 });
    if (filterPeriod === 'mes') return isThisMonth(d);
    if (filterPeriod === 'vencidos') return isPast(d) && !isToday(d);
    return true;
  };

  const applyItemFilters = (i: Item): boolean => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo && i.tipo !== filterTipo) return false;
    if (filterArea && i.area !== filterArea) return false;
    if (filterFase && i.fase !== filterFase) return false;
    if (!matchesPeriod(i.deadline)) return false;
    return true;
  };

  const sortItems = (arr: Item[]): Item[] => {
    const copy = [...arr];
    if (sortKey === 'prioridade') {
      copy.sort((a, b) => (PRIORITY_RANK[a.priority || 'baixa'] ?? 3) - (PRIORITY_RANK[b.priority || 'baixa'] ?? 3));
    } else {
      const dir = sortKey === 'data-asc' ? 1 : -1;
      copy.sort((a, b) => {
        const da = safeDate(a.deadline)?.getTime() ?? Infinity;
        const db = safeDate(b.deadline)?.getTime() ?? Infinity;
        return (da - db) * dir;
      });
    }
    return copy;
  };

  // Filtered datasets
  const filteredItemsAll = useMemo(() => items.filter(applyItemFilters), [items, search, filterTipo, filterArea, filterFase, filterPeriod]);

  const pendingInbox = useMemo(() => {
    return inbox.filter(e => {
      if (e.status !== 'pending') return false;
      if (search && !e.content.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [inbox, search]);

  const todayAgenda = useMemo(() => agendaEntries.filter(e => {
    const date = safeDate(e.datetime);
    if (!date || !isToday(date)) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (e.source === 'item') {
      const linked = items.find(i => i.id === e.sourceId);
      if (linked && !applyItemFilters(linked)) return false;
    } else {
      // standalone event: only basic filters apply (period via datetime)
      if (filterPeriod && !matchesPeriod(format(date, 'yyyy-MM-dd'))) return false;
      if (filterTipo || filterArea || filterFase) return false;
    }
    return true;
  }), [agendaEntries, items, search, filterTipo, filterArea, filterFase, filterPeriod]);

  const todayItems = useMemo(() => sortItems(filteredItemsAll.filter(i => {
    const date = safeDate(i.deadline);
    return date ? isToday(date) && i.fase !== 'Concluído' : false;
  })), [filteredItemsAll, sortKey]);

  const urgentes = useMemo(() => sortItems(filteredItemsAll.filter(i => i.tags.includes('urgente') && i.fase !== 'Concluído')), [filteredItemsAll, sortKey]);
  const travado = useMemo(() => sortItems(filteredItemsAll.filter(i => i.fase === 'Travado')), [filteredItemsAll, sortKey]);
  const overdue = useMemo(() => sortItems(filteredItemsAll.filter(i => {
    const date = safeDate(i.deadline);
    return date ? isPast(date) && !isToday(date) && i.fase !== 'Concluído' : false;
  })), [filteredItemsAll, sortKey]);
  const andando = useMemo(() => sortItems(filteredItemsAll.filter(i => i.fase === 'Em andamento')), [filteredItemsAll, sortKey]);

  const storyMap: Record<string, StoryDef> = {
    agora: {
      key: 'agora',
      label: 'Agora',
      icon: <AlarmClock className="h-4 w-4" />,
      count: todayAgenda.length + todayItems.length,
      accent: 'from-primary/20 to-primary/5 ring-primary/30',
      empty: { emoji: '☕', text: 'Sem compromissos agora. Aproveite!' },
      render: () => (
        <div className="space-y-2">
          {todayAgenda.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agenda de hoje</p>
              {todayAgenda.map(e => {
                const linkedItem = e.source === 'item' ? items.find(i => i.id === e.sourceId) : undefined;
                const isConcluido = linkedItem?.fase === 'Concluído';
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-colors",
                      isConcluido && "opacity-60"
                    )}
                    onClick={() => e.source === 'item' ? navigate(`/items/${e.sourceId}`) : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (e.source === 'item') {
                            const newFase = isConcluido ? 'Inbox' : 'Concluído';
                            updateItem(e.sourceId, { fase: newFase });
                            toast.success(isConcluido ? 'Item reaberto' : 'Item concluído ✅');
                          } else {
                            deleteEvent(e.sourceId);
                            toast.success('Evento removido');
                          }
                        }}
                        className={cn(
                          "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isConcluido
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                        )}
                        aria-label={isConcluido ? 'Reabrir' : 'Concluir'}
                      >
                        {isConcluido && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium text-foreground flex-1", isConcluido && "line-through")}>{e.title}</p>
                          <Badge variant="outline" className="text-[9px] shrink-0">{e.type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">🕐 {format(safeDate(e.datetime) || new Date(e.datetime), 'HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {todayItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tarefas para hoje</p>
              {todayItems.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      ),
    },
    urgentes: {
      key: 'urgentes',
      label: 'Urgentes',
      icon: <Flame className="h-4 w-4" />,
      count: urgentes.length + overdue.length,
      accent: 'from-destructive/20 to-destructive/5 ring-destructive/30',
      empty: { emoji: '✅', text: 'Nenhuma urgência. Está tudo sob controle.' },
      render: () => (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">⚠ Vencidos</p>
              {overdue.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
          {urgentes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">🔴 Urgentes</p>
              {urgentes.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      ),
    },
    inbox: {
      key: 'inbox',
      label: 'Inbox',
      icon: <Inbox className="h-4 w-4" />,
      count: pendingInbox.length,
      accent: 'from-amber-500/20 to-amber-500/5 ring-amber-500/30',
      empty: { emoji: '📥', text: 'Inbox vazia. Capture sua próxima ideia.' },
      render: () => (
        <div className="space-y-2">
          {pendingInbox.map(entry => <InboxEntryCard key={entry.id} entry={entry} />)}
        </div>
      ),
    },
    'em-andamento': {
      key: 'em-andamento',
      label: 'Em andamento',
      icon: <Rocket className="h-4 w-4" />,
      count: andando.length,
      accent: 'from-blue-500/20 to-blue-500/5 ring-blue-500/30',
      empty: { emoji: '🚀', text: 'Nada em execução. Pegue um item para começar.' },
      render: () => (
        <div className="space-y-2">
          {andando.map(i => <ItemCard key={i.id} item={i} />)}
        </div>
      ),
    },
    travado: {
      key: 'travado',
      label: 'Travado',
      icon: <Ban className="h-4 w-4" />,
      count: travado.length,
      accent: 'from-orange-500/20 to-orange-500/5 ring-orange-500/30',
      empty: { emoji: '🆗', text: 'Sem bloqueios. Fluxo livre.' },
      render: () => (
        <div className="space-y-2">
          {travado.map(i => <ItemCard key={i.id} item={i} />)}
        </div>
      ),
    },
  };

  const stories: StoryDef[] = storyOrder.map(k => storyMap[k]).filter(Boolean);

  // Track active card via scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let timeout: NodeJS.Timeout;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const cards = el.querySelectorAll<HTMLElement>('[data-story-card]');
        const center = el.scrollLeft + el.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        cards.forEach((c, i) => {
          const cardCenter = c.offsetLeft + c.offsetWidth / 2;
          const dist = Math.abs(center - cardCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        });
        setActiveIdx(bestIdx);
      }, 60);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToIdx = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>('[data-story-card]')[i];
    if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
  };

  const handleDragStart = (key: string) => setDragKey(key);
  const handleDragOver = (e: React.DragEvent, overKey: string) => {
    e.preventDefault();
    if (!dragKey || dragKey === overKey) return;
    setStoryOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragKey);
      const to = next.indexOf(overKey);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragKey);
      return next;
    });
  };
  const handleDragEnd = () => setDragKey(null);

  const moveStory = (key: string, dir: -1 | 1) => {
    setStoryOrder(prev => {
      const next = [...prev];
      const i = next.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const SortChip = ({ value, label }: { value: SortKey; label: string }) => (
    <button
      onClick={() => setSortKey(value)}
      className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', sortKey === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
    >
      {label}
    </button>
  );

  const FilterRow = ({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) => (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onChange(null)}
        className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', !value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
      >
        {label}
      </button>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(value === o ? null : o)}
          className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', value === o ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
        >
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-muted/60 text-sm rounded-xl pl-9 pr-3 h-9 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>

      {/* Filters */}
      <div className="space-y-1.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {([
            { key: null, label: 'Qualquer data' },
            { key: 'hoje', label: 'Hoje' },
            { key: 'semana', label: 'Esta semana' },
            { key: 'mes', label: 'Este mês' },
            { key: 'vencidos', label: '⚠ Vencidos' },
          ] as { key: PeriodFilter | null; label: string }[]).map(p => (
            <button
              key={p.label}
              onClick={() => setFilterPeriod(p.key)}
              className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', filterPeriod === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <FilterRow label="Todos tipos" options={settings.tipos} value={filterTipo} onChange={setFilterTipo} />
        <FilterRow label="Todas fases" options={visibleFases} value={filterFase} onChange={setFilterFase} />
        <FilterRow label="Todas áreas" options={settings.areas} value={filterArea} onChange={setFilterArea} />
        {/* Sort */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar items-center">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          <SortChip value="data-asc" label="Data ↑" />
          <SortChip value="data-desc" label="Data ↓" />
          <SortChip value="prioridade" label="Prioridade" />
        </div>
      </div>

      {/* Tabs (chips) with reorder */}
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 pb-1">
          {stories.map((s, i) => (
            <div
              key={s.key}
              draggable={reorderMode}
              onDragStart={() => handleDragStart(s.key)}
              onDragOver={(e) => handleDragOver(e, s.key)}
              onDragEnd={handleDragEnd}
              className={cn(
                'shrink-0 flex items-center gap-1 rounded-full transition-all',
                dragKey === s.key && 'opacity-50'
              )}
            >
              {reorderMode && (
                <button
                  onClick={() => moveStory(s.key, -1)}
                  className="h-6 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Mover esquerda"
                >‹</button>
              )}
              <button
                onClick={() => !reorderMode && scrollToIdx(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  reorderMode && 'cursor-grab active:cursor-grabbing',
                  activeIdx === i && !reorderMode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {reorderMode && <GripVertical className="h-3 w-3" />}
                {s.icon}
                <span>{s.label}</span>
                {s.count > 0 && (
                  <span className={cn(
                    'min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                    activeIdx === i && !reorderMode ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground'
                  )}>
                    {s.count}
                  </span>
                )}
              </button>
              {reorderMode && (
                <button
                  onClick={() => moveStory(s.key, 1)}
                  className="h-6 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Mover direita"
                >›</button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setReorderMode(v => !v)}
          className={cn(
            'shrink-0 text-[10px] px-2 py-1 rounded-full font-medium transition-colors',
            reorderMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {reorderMode ? 'OK' : 'Ordenar'}
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 no-scrollbar pb-2"
        style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
      >
        {stories.map((s, i) => (
          <div
            key={s.key}
            data-story-card
            className="snap-start shrink-0 w-[88vw] max-w-[440px]"
          >
            <div className={cn(
              'rounded-2xl bg-gradient-to-br ring-1 p-3 min-h-[300px]',
              s.accent
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-card flex items-center justify-center text-foreground">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.count} {s.count === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{i + 1}/{stories.length}</span>
              </div>
              {s.count === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">{s.empty.emoji}</p>
                  <p className="text-xs text-muted-foreground">{s.empty.text}</p>
                </div>
              ) : (
                <div className="max-h-[58vh] overflow-y-auto no-scrollbar -mx-1 px-1">
                  {s.render()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Final story: visão completa */}
        <div data-story-card className="snap-start shrink-0 w-[88vw] max-w-[440px]">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-muted ring-1 ring-border p-4 min-h-[300px] flex flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm font-bold text-foreground">Quer ver tudo?</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Acesse a gestão completa no Painel.</p>
            <button
              onClick={() => navigate('/reports')}
              className="bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Abrir Painel
            </button>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {stories.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIdx(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              activeIdx === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )}
            aria-label={`Ir para card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
