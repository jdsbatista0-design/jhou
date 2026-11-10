import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2, CalendarDays, Wallet, Repeat } from 'lucide-react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useCentral, AgendaEntry } from '@/contexts/CentralContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseLocalDateTime } from '@/lib/dates';
import { formatBRL } from '@/types/finance';
import { competenceForDueMonth, shiftMonthISO } from '@/lib/billsByDue';
import AppointmentSheet from '@/components/AppointmentSheet';
import AgendaCalendar from '@/components/agenda/AgendaCalendar';
import { RecurringDeleteDialog, DeleteScope } from '@/components/RecurringDeleteDialog';
import { toast } from 'sonner';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

type Row =
  | { kind: 'entry'; time: string; entry: AgendaEntry }
  | { kind: 'bill'; time: string; id: string; title: string; amount: number };

export default function TodayPage() {
  const { agendaEntries, updateItem, deleteEvent, deleteRecurringItem, setOccurrenceDone, cancelOccurrence, endRecurrenceFrom, deleteRecurrence } = useCentral();
  const { cards, transactions, getCardStatement } = useFinance();
  const navigate = useNavigate();
  const [day, setDay] = useState(startOfDay(new Date()));
  const [showMonth, setShowMonth] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgendaEntry | null>(null);

  const strip = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i - 1)), []);
  const dateOf = (e: AgendaEntry) => parseLocalDateTime(e.datetime) || new Date(e.datetime);

  /** Vencimentos (faturas + contas pendentes) por dia. */
  const billsByDay = useMemo(() => {
    const map = new Map<string, { id: string; title: string; amount: number }[]>();
    const push = (d: string, v: { id: string; title: string; amount: number }) => map.set(d, [...(map.get(d) || []), v]);
    const base = format(new Date(), 'yyyy-MM');
    for (const c of cards.filter(c => !c.archived)) {
      for (let i = -1; i <= 2; i++) {
        const st = getCardStatement(c.id, competenceForDueMonth(shiftMonthISO(base, i), c.closingDay, c.dueDay));
        if (st.due && st.remaining > 0.009) push(st.due, { id: `card-${c.id}-${st.due}`, title: `Fatura ${c.name}`, amount: st.remaining });
      }
    }
    for (const t of transactions) {
      if (t.status !== 'pending' || t.cardId || t.kind === 'income' || t.kind === 'receivable') continue;
      push(t.occurredOn, { id: `tx-${t.id}`, title: t.description, amount: t.amount });
    }
    return map;
  }, [cards, transactions, getCardStatement]);

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = agendaEntries
      .filter(e => isSameDay(dateOf(e), day))
      .map(e => ({ kind: 'entry' as const, time: format(dateOf(e), 'HH:mm'), entry: e }));
    for (const b of billsByDay.get(ymd(day)) || []) list.push({ kind: 'bill', time: '', ...b });
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [agendaEntries, billsByDay, day]);

  const isDone = (e: AgendaEntry) => e.source === 'recurrence' ? !!e.done : e.source === 'item' && e.item?.fase === 'Concluído';
  const countFor = (d: Date) => agendaEntries.filter(e => isSameDay(dateOf(e), d)).length + (billsByDay.get(ymd(d))?.length || 0);

  const toggle = async (e: AgendaEntry) => {
    if (e.source === 'recurrence' && e.recurrence && e.occurrenceDate) {
      await setOccurrenceDone(e.recurrence.id, e.occurrenceDate, !e.done);
    } else if (e.source === 'item') {
      const done = e.item?.fase === 'Concluído';
      updateItem(e.sourceId, { fase: done ? 'Inbox' : 'Concluído' });
    }
  };

  const remove = (e: AgendaEntry) => {
    if (e.source === 'event') { deleteEvent(e.sourceId); toast.success('Removido'); return; }
    setDeleteTarget(e);
  };

  const meetings = rows.filter(r => r.kind === 'entry').length;
  const dueCount = rows.filter(r => r.kind === 'bill').length;
  const isToday = isSameDay(day, new Date());

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="font-display text-2xl font-bold capitalize">
          {isToday ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}
          <span className="text-muted-foreground font-medium text-lg"> · {format(day, "dd 'de' MMM", { locale: ptBR })}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {meetings === 0 && dueCount === 0 ? 'Dia livre.' : [
            meetings ? `${meetings} ${meetings === 1 ? 'compromisso' : 'compromissos'}` : '',
            dueCount ? `${dueCount} ${dueCount === 1 ? 'conta vence' : 'contas vencem'}` : '',
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Faixa de dias */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x">
        {strip.map(d => {
          const sel = isSameDay(d, day);
          const n = countFor(d);
          return (
            <button key={d.toISOString()} onClick={() => setDay(d)}
              className={cn('snap-start shrink-0 w-14 h-[72px] rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition',
                sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
              <span className={cn('text-[11px] uppercase font-semibold', !sel && 'text-muted-foreground')}>{format(d, 'EEE', { locale: ptBR }).replace('.', '').slice(0, 3)}</span>
              <span className="font-display text-xl font-bold leading-none">{format(d, 'd')}</span>
              <span className={cn('h-1.5 w-1.5 rounded-full', n ? (sel ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent')} />
            </button>
          );
        })}
      </div>

      <button onClick={() => setShowMonth(v => !v)} className="h-10 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <CalendarDays className="h-4 w-4" />{showMonth ? 'Esconder calendário' : 'Ver mês inteiro'}
      </button>
      {showMonth && <AgendaCalendar entries={agendaEntries} selectedDate={day} onSelectDate={d => { setDay(startOfDay(d)); setShowMonth(false); }} />}

      {/* Lista do dia */}
      <div className="space-y-2.5">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Nada marcado.</p>
            <Button variant="link" onClick={() => setNewOpen(true)}>Adicionar compromisso</Button>
          </div>
        )}
        {rows.map(r => r.kind === 'bill' ? (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-card p-4">
            <span className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0"><Wallet className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{r.title}</p>
              <p className="text-sm text-muted-foreground" data-mono>{formatBRL(r.amount)}</p>
            </div>
            <Button onClick={() => navigate('/dinheiro')} className="h-11 rounded-full px-5">Pagar</Button>
          </div>
        ) : (() => {
          const e = r.entry; const done = isDone(e);
          return (
            <div key={e.id} className={cn('flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pl-2', done && 'opacity-60')}>
              <button onClick={() => toggle(e)} aria-label={done ? 'Desmarcar' : 'Concluir'}
                className="h-11 w-11 flex items-center justify-center shrink-0">
                <span className={cn('h-6 w-6 rounded-full border-2 flex items-center justify-center', done ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                  {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </button>
              <button className="flex-1 min-w-0 text-left" onClick={() => e.source === 'item' && navigate(`/items/${e.sourceId}`)}>
                <p className={cn('font-semibold truncate', done && 'line-through')}>{e.title}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span data-mono>{r.time}</span>{e.source === 'recurrence' && <><Repeat className="h-3.5 w-3.5" />rotina</>}
                </p>
              </button>
              <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground shrink-0" aria-label={`Excluir ${e.title}`} onClick={() => remove(e)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          );
        })())}
      </div>

      {/* Botão único */}
      <button onClick={() => setNewOpen(true)} aria-label="Novo compromisso"
        className="fixed right-5 z-40 h-14 pl-5 pr-6 rounded-full bg-primary text-primary-foreground shadow-panel flex items-center gap-2 font-semibold"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        <Plus className="h-5 w-5" />Compromisso
      </button>

      <AppointmentSheet open={newOpen} onOpenChange={setNewOpen} defaultDate={ymd(day)} />

      <RecurringDeleteDialog
        open={!!deleteTarget}
        onOpenChange={v => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget?.title || ''}
        isRecurring={deleteTarget?.source === 'recurrence' || !!deleteTarget?.item?.recurrenceId}
        onConfirm={async (scope: DeleteScope) => {
          const t = deleteTarget; if (!t) return;
          if (t.source === 'recurrence' && t.recurrence && t.occurrenceDate) {
            if (scope === 'one') await cancelOccurrence(t.recurrence.id, t.occurrenceDate);
            else if (scope === 'future') await endRecurrenceFrom(t.recurrence.id, t.occurrenceDate);
            else await deleteRecurrence(t.recurrence.id, true);
          } else {
            await deleteRecurringItem(t.sourceId, scope);
          }
          toast.success(scope === 'all' ? 'Série removida' : scope === 'future' ? 'Este e os próximos removidos' : 'Removido');
        }}
      />
    </div>
  );
}
