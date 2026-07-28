import { useMemo, useState } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';

const FASE_COLORS: Record<string, string> = {
  'Inbox': 'bg-muted-foreground/60',
  'Em andamento': 'bg-blue-500',
  'Aguardando': 'bg-amber-500',
  'Travado': 'bg-red-500',
  'Concluído': 'bg-emerald-500',
  'Arquivado': 'bg-muted-foreground/30',
};

const DAY_PX = 28; // width per day column
const ROW_PX = 32; // bar height
const HORIZONS = [
  { key: '4w', label: '4 sem', days: 28 },
  { key: '8w', label: '8 sem', days: 56 },
  { key: '12w', label: '12 sem', days: 84 },
] as const;

type HorizonKey = typeof HORIZONS[number]['key'];

function projectKey(it: Item): string {
  return (it.asset && it.asset.trim()) || it.area || 'Sem projeto';
}

function itemRange(it: Item, today: Date): { start: Date; end: Date } | null {
  if (!it.deadline) return null;
  const end = startOfDay(new Date(it.deadline));
  if (Number.isNaN(end.getTime())) return null;
  const created = startOfDay(new Date(it.createdAt));
  // Start = created date, but never before today - N days back (clamped by view)
  const start = created > end ? end : created;
  return { start, end };
}

export default function InboxGantt() {
  const { items } = useCentral();
  const navigate = useNavigate();
  const [horizon, setHorizon] = useState<HorizonKey>('8w');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [includeDone, setIncludeDone] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = HORIZONS.find(h => h.key === horizon)!.days;
  const rangeStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const rangeEnd = useMemo(() => endOfWeek(addDays(rangeStart, days - 1), { weekStartsOn: 1 }), [rangeStart, days]);
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (it.recurrenceId || it.origin === 'recurrence') return false;
      if (it.fase === 'Arquivado') return false;
      if (!includeDone && it.fase === 'Concluído') return false;
      const r = itemRange(it, today);
      if (!r) return false;
      // Bar must intersect the visible window
      return r.end >= rangeStart && r.start <= rangeEnd;
    });
  }, [items, includeDone, rangeStart, rangeEnd, today]);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filtered) {
      const k = projectKey(it);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    // Sort items by start date; groups by name
    const arr = Array.from(map.entries()).map(([name, list]) => ({
      name,
      items: list.sort((a, b) => {
        const ra = itemRange(a, today)!;
        const rb = itemRange(b, today)!;
        return ra.start.getTime() - rb.start.getTime();
      }),
    }));
    arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return arr;
  }, [filtered, today]);

  const toggle = (name: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Build day columns with week separators
  const dayCols = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, totalDays]);

  const gridWidth = totalDays * DAY_PX;
  const todayOffset = differenceInCalendarDays(today, rangeStart) * DAY_PX;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5 bg-surface rounded-chip p-0.5">
          {HORIZONS.map(h => (
            <button
              key={h.key}
              onClick={() => setHorizon(h.key)}
              className={cn(
                'tap-target px-2.5 rounded-chip text-[11px] font-semibold transition-colors',
                horizon === h.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeDone}
            onChange={e => setIncludeDone(e.target.checked)}
            className="h-3 w-3 accent-primary"
          />
          Concluídos
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          Nenhum item com prazo neste período. Adicione uma data de entrega para ver aqui.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex">
            {/* Fixed left column with project + item labels */}
            <div className="shrink-0 w-40 border-r border-border bg-card">
              {/* Header spacer matching the two header rows */}
              <div className="h-10 border-b border-border bg-surface/50" />
              {groups.map(g => {
                const isCollapsed = collapsed.has(g.name);
                return (
                  <div key={g.name}>
                    <button
                      onClick={() => toggle(g.name)}
                      className="w-full flex items-center gap-1 px-2 py-1.5 border-b border-border/60 text-left hover:bg-surface/60"
                      style={{ height: ROW_PX }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-[11px] font-semibold text-foreground truncate">{g.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground" data-mono>
                        {g.items.length}
                      </span>
                    </button>
                    {!isCollapsed &&
                      g.items.map(it => (
                        <button
                          key={it.id}
                          onClick={() => navigate(`/item/${it.id}`)}
                          className="w-full flex items-center gap-1.5 px-2 border-b border-border/40 text-left hover:bg-surface/40"
                          style={{ height: ROW_PX }}
                        >
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full shrink-0', FASE_COLORS[it.fase] || 'bg-muted-foreground')}
                          />
                          <span className="text-[11px] text-foreground/90 truncate">{it.title}</span>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>

            {/* Scrollable timeline */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: gridWidth }} className="relative">
                {/* Header: months/weeks */}
                <div className="h-5 border-b border-border/60 bg-surface/60 flex text-[10px] text-muted-foreground">
                  {dayCols.map((d, i) => {
                    const isMonthStart = d.getDate() === 1 || i === 0;
                    if (!isMonthStart) return null;
                    const nextMonth = dayCols.findIndex(
                      (x, j) => j > i && (x.getDate() === 1 || j === dayCols.length - 1),
                    );
                    const end = nextMonth === -1 ? dayCols.length : nextMonth;
                    const width = (end - i) * DAY_PX;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-5 px-1.5 flex items-center border-r border-border/40 font-semibold uppercase tracking-wide"
                        style={{ left: i * DAY_PX, width }}
                      >
                        {format(d, 'MMM yyyy', { locale: ptBR })}
                      </div>
                    );
                  })}
                </div>
                {/* Header: days */}
                <div className="h-5 border-b border-border bg-surface/40 flex text-[9px] text-muted-foreground">
                  {dayCols.map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        'shrink-0 flex flex-col items-center justify-center border-r',
                        d.getDay() === 1 ? 'border-border/60' : 'border-border/20',
                        isSameDay(d, today) && 'bg-primary/10 text-primary font-semibold',
                        (d.getDay() === 0 || d.getDay() === 6) && 'bg-surface/70',
                      )}
                      style={{ width: DAY_PX }}
                    >
                      <span data-mono>{d.getDate()}</span>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {groups.map(g => {
                  const isCollapsed = collapsed.has(g.name);
                  return (
                    <div key={g.name}>
                      <div style={{ height: ROW_PX }} className="border-b border-border/60 bg-surface/30" />
                      {!isCollapsed &&
                        g.items.map(it => {
                          const r = itemRange(it, today)!;
                          const clampedStart = r.start < rangeStart ? rangeStart : r.start;
                          const clampedEnd = r.end > rangeEnd ? rangeEnd : r.end;
                          const offset = differenceInCalendarDays(clampedStart, rangeStart) * DAY_PX;
                          const length = Math.max(
                            DAY_PX * 0.9,
                            (differenceInCalendarDays(clampedEnd, clampedStart) + 1) * DAY_PX - 4,
                          );
                          const overdue =
                            r.end < today && it.fase !== 'Concluído';
                          const done = it.fase === 'Concluído';
                          return (
                            <div
                              key={it.id}
                              style={{ height: ROW_PX }}
                              className="relative border-b border-border/40"
                            >
                              {/* Weekend/day grid lines */}
                              <div className="absolute inset-0 flex pointer-events-none">
                                {dayCols.map((d, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'shrink-0 border-r',
                                      d.getDay() === 1 ? 'border-border/40' : 'border-border/10',
                                      (d.getDay() === 0 || d.getDay() === 6) && 'bg-surface/40',
                                    )}
                                    style={{ width: DAY_PX }}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={() => navigate(`/item/${it.id}`)}
                                className={cn(
                                  'absolute top-1.5 rounded-md px-2 flex items-center text-[10px] font-medium text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md truncate',
                                  overdue ? 'bg-red-500' : FASE_COLORS[it.fase] || 'bg-primary',
                                  done && 'opacity-60 line-through',
                                )}
                                style={{
                                  left: offset + 2,
                                  width: length,
                                  height: ROW_PX - 12,
                                }}
                                title={`${it.title} — ${format(r.end, "dd 'de' MMM", { locale: ptBR })}`}
                              >
                                <span className="truncate">{it.title}</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}

                {/* Today line */}
                {isWithinInterval(today, { start: rangeStart, end: rangeEnd }) && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none"
                    style={{ left: todayOffset + DAY_PX / 2 }}
                  >
                    <div className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-1">
        {Object.entries(FASE_COLORS)
          .filter(([k]) => k !== 'Arquivado' && (includeDone || k !== 'Concluído'))
          .map(([k, cls]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-sm', cls)} /> {k}
            </span>
          ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-red-500" /> Atrasado
        </span>
      </div>
    </div>
  );
}
