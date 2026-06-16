import { useMemo, useState } from 'react';
import { Trash2, Check, Repeat, Bell, CalendarDays, List, Wallet } from 'lucide-react';
import { useCentral, AgendaEntry } from '@/contexts/CentralContext';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AgendaCalendar from '@/components/agenda/AgendaCalendar';
import { parseLocalDateTime } from '@/lib/dates';
import { RecurrencesManager } from '@/components/RecurrencesManager';
import { formatBRL } from '@/types/finance';

type View = 'calendar' | 'list' | 'recurrences';

export default function AgendaPage() {
  const { agendaEntries, updateItem, deleteEvent } = useCentral();
  const { transactions, updateTransaction } = useFinance();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Vencimentos financeiros pendentes viram entradas virtuais na agenda
  const financeEntries = useMemo<AgendaEntry[]>(() => {
    return transactions
      .filter(t => t.status === 'pending')
      .map(t => ({
        id: `fin-${t.id}`,
        title: `${t.kind === 'income' || t.kind === 'receivable' ? '↓' : '↑'} ${t.description} · ${formatBRL(t.amount)}`,
        datetime: `${t.occurredOn}T08:00`,
        type: t.kind === 'income' || t.kind === 'receivable' ? 'A receber' : 'A pagar',
        source: 'event' as const,
        sourceId: t.id,
        item: { origin: 'finance' } as any,
      }));
  }, [transactions]);

  const allEntries = useMemo(() => {
    return [...agendaEntries, ...financeEntries].sort((a, b) => {
      const ad = parseLocalDateTime(a.datetime) || new Date(a.datetime);
      const bd = parseLocalDateTime(b.datetime) || new Date(b.datetime);
      return ad.getTime() - bd.getTime();
    });
  }, [agendaEntries, financeEntries]);

  const entryDate = (entry: AgendaEntry) => parseLocalDateTime(entry.datetime) || new Date(entry.datetime);

  const today = allEntries.filter(e => isToday(entryDate(e)));
  const tomorrow = allEntries.filter(e => isTomorrow(entryDate(e)));
  const week = allEntries.filter(e =>
    isThisWeek(entryDate(e), { weekStartsOn: 1 }) &&
    !isToday(entryDate(e)) && !isTomorrow(entryDate(e))
  );
  const later = allEntries.filter(e =>
    !isToday(entryDate(e)) && !isTomorrow(entryDate(e)) &&
    !isThisWeek(entryDate(e), { weekStartsOn: 1 })
  );

  const handleConclude = (entry: AgendaEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.id.startsWith('fin-')) {
      updateTransaction(entry.sourceId, { status: 'confirmed' });
      toast.success('Marcado como pago ✅');
      return;
    }
    if (entry.source === 'item') {
      const isConcluido = entry.item?.fase === 'Concluído';
      updateItem(entry.sourceId, { fase: isConcluido ? 'Inbox' : 'Concluído' });
      toast.success(isConcluido ? 'Item reaberto' : 'Item concluído ✅');
    } else {
      deleteEvent(entry.sourceId);
      toast.success('Evento removido');
    }
  };

  const renderEntry = (entry: AgendaEntry) => {
    const isConcluido = entry.source === 'item' && entry.item?.fase === 'Concluído';
    const origin = entry.item?.origin || 'manual';
    const originColor =
      origin === 'finance' ? 'border-l-amber-500' :
      origin === 'inbox' ? 'border-l-blue-500' :
      origin === 'recurrence' ? 'border-l-violet-500' :
      'border-l-primary/40';
    return (
      <div
        key={entry.id}
        className={cn(
          "bg-card border border-border border-l-4 rounded-xl p-3 flex items-start justify-between cursor-pointer hover:border-primary/30 transition-colors",
          originColor,
          isConcluido && "opacity-60"
        )}
        onClick={() => entry.source === 'item' ? navigate(`/items/${entry.sourceId}`) : undefined}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => handleConclude(entry, e)}
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
          <div className="space-y-1 flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-foreground", isConcluido && "line-through")}>{entry.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(entryDate(entry), "HH:mm · EEEE, dd/MM", { locale: ptBR })} · {entry.type}
            </p>
            {entry.item && (
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="secondary" className="text-[9px]">{entry.item.area}</Badge>
                <Badge variant="outline" className="text-[9px]">{entry.item.fase}</Badge>
                {entry.item.recurrenceId && (
                  <Badge variant="outline" className="text-[9px] gap-0.5"><Repeat className="h-2.5 w-2.5" /> recorrente</Badge>
                )}
                {entry.item.reminderMinutes && (
                  <Badge variant="outline" className="text-[9px] gap-0.5"><Bell className="h-2.5 w-2.5" /> {entry.item.reminderMinutes}min</Badge>
                )}
              </div>
            )}
          </div>
        </div>
        {entry.source === 'event' && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={e => { e.stopPropagation(); deleteEvent(entry.sourceId); toast.success('Evento removido'); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const renderGroup = (label: string, list: AgendaEntry[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h2>
        {list.map(renderEntry)}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">Agenda</h1>
        <p className="text-[10px] text-muted-foreground text-right leading-tight">
          Use o <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold align-middle">+</span> para criar.
        </p>
      </div>

      <div className="flex gap-1 bg-surface rounded-chip p-0.5 w-full">
        {([
          { id: 'calendar', label: 'Mês', icon: CalendarDays },
          { id: 'list', label: 'Lista', icon: List },
          { id: 'recurrences', label: 'Recorrentes', icon: Repeat },
        ] as const).map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              className={cn(
                'tap-target flex-1 text-xs px-2 rounded-chip inline-flex items-center justify-center gap-1.5 transition-colors',
                view === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {opt.label}
            </button>
          );
        })}
      </div>

      {view === 'calendar' && (
        <div className="space-y-3">
          <AgendaCalendar
            entries={allEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>
            {(() => {
              const list = agendaEntries.filter(e => isSameDay(entryDate(e), selectedDate));
              if (list.length === 0) {
                return <p className="text-xs text-muted-foreground py-4 text-center">Nada para este dia.</p>;
              }
              return list.map(renderEntry);
            })()}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Manual</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Inbox</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Financeiro</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />Recorrente</span>
          </div>
        </div>
      )}

      {view === 'list' && (
        <>
          {renderGroup('Hoje', today)}
          {renderGroup('Amanhã', tomorrow)}
          {renderGroup('Esta semana', week)}
          {renderGroup('Próximos', later)}
          {agendaEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm text-muted-foreground">Nada na agenda.</p>
            </div>
          )}
        </>
      )}

      {view === 'recurrences' && <RecurrencesManager />}
    </div>
  );
}
