import { useMemo, useState } from 'react';
import { AgendaEntry } from '@/contexts/CentralContext';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseLocalDateTime } from '@/lib/dates';

interface Props {
  entries: AgendaEntry[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function AgendaCalendar({ entries, selectedDate, onSelectDate }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(selectedDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const out: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    for (const e of entries) {
      const dt = parseLocalDateTime(e.datetime) || new Date(e.datetime);
      const key = format(dt, 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold capitalize">
          {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEK_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {l}
          </div>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = byDay.get(key) || [];
          const inMonth = isSameMonth(day, cursor);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const origins = Array.from(new Set(dayEntries.map(e => e.item?.origin || 'manual'))).slice(0, 3);
          const dotColor = (o: string) => {
            if (selected) return 'bg-primary-foreground';
            if (o === 'inbox') return 'bg-blue-500';
            if (o === 'finance') return 'bg-amber-500';
            if (o === 'recurrence') return 'bg-violet-500';
            return 'bg-primary';
          };
          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors relative',
                !inMonth && 'text-muted-foreground/40',
                inMonth && !selected && !today && 'hover:bg-muted text-foreground',
                today && !selected && 'bg-primary/10 text-primary font-semibold',
                selected && 'bg-primary text-primary-foreground font-semibold',
              )}
            >
              <span data-mono>{day.getDate()}</span>
              {origins.length > 0 && (
                <div className="flex gap-0.5">
                  {origins.map((o, i) => (
                    <span
                      key={i}
                      className={cn('h-1 w-1 rounded-full', dotColor(o))}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
