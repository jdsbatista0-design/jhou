import { useCentral } from '@/contexts/CentralContext';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ArrowUpRight, Zap, Check, Target as TargetIcon, MoreHorizontal } from 'lucide-react';
import { Item } from '@/types/central';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInCalendarDays } from 'date-fns';

type Tab = 'devo' | 'aguardo' | 'decidir';

function score(item: Item): number {
  const impact = item.impactScore ?? 0;
  const blockers = item.blockedPeople ?? 0;
  const overdueBonus = item.deadline && item.deadline < new Date().toISOString().slice(0, 10) ? 100 : 0;
  const ageDays = Math.max(0, differenceInCalendarDays(new Date(), new Date(item.createdAt)));
  return impact * 10 + blockers * 25 + overdueBonus + Math.min(ageDays, 30);
}

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function daysAgo(iso: string) {
  const d = differenceInCalendarDays(new Date(), new Date(iso));
  if (d <= 0) return 'hoje';
  if (d === 1) return '1d';
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mês`;
}

export default function HomePending() {
  const { items, updateItem, setPriority, dailyPriorities } = useCentral();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('devo');

  const buckets = useMemo(() => {
    const open = items.filter(i => i.fase !== 'Concluído' && !i.recurrenceId && i.origin !== 'recurrence');
    const sort = (a: Item, b: Item) => score(b) - score(a);
    return {
      devo: open.filter(i => i.kind === 'my_action' || (!i.kind && i.fase !== 'Aguardando')).sort(sort),
      aguardo: open.filter(i => i.kind === 'waiting_someone' || (!i.kind && i.fase === 'Aguardando')).sort(sort),
      decidir: open.filter(i => i.kind === 'my_decision').sort(sort),
    };
  }, [items]);

  const list = buckets[tab].slice(0, 8);
  const totals = { devo: buckets.devo.length, aguardo: buckets.aguardo.length, decidir: buckets.decidir.length };

  const promoteToPriority = async (id: string) => {
    const usedSlots = new Set(dailyPriorities.map(p => p.slot));
    const freeSlot = ([1, 2, 3] as const).find(s => !usedSlots.has(s));
    if (!freeSlot) {
      toast.error('Os 3 slots de hoje estão cheios');
      return;
    }
    await setPriority(freeSlot, id);
    toast.success(`Adicionado como prioridade ${freeSlot}`);
  };

  const conclude = (id: string) => {
    updateItem(id, { fase: 'Concluído' });
    toast.success('Concluído');
  };

  const nudge = (item: Item) => {
    updateItem(item.id, { updatedAt: new Date().toISOString() });
    toast.success(item.waitingFor ? `Cutucar ${item.waitingFor} — marcado como retomado hoje` : 'Marcado como retomado');
  };

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: 'devo', label: 'Devo fazer', icon: ArrowUpRight, count: totals.devo },
    { id: 'aguardo', label: 'Aguardo', icon: UserRound, count: totals.aguardo },
    { id: 'decidir', label: 'Decidir', icon: Zap, count: totals.decidir },
  ];

  if (totals.devo + totals.aguardo + totals.decidir === 0) return null;

  return (
    <section className="rounded-xl border border-surface-2 bg-surface overflow-hidden">
      <div className="flex border-b border-surface-2">
        {tabs.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              <span className={cn(
                'text-[10px] px-1.5 rounded-full',
                active ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground',
              )}>{t.count}</span>
              {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-surface-2">
        {list.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">Nada aqui. Respira.</div>
        ) : (
          list.map(item => {
            const isWaiting = tab === 'aguardo';
            const personLabel = isWaiting ? item.waitingFor : item.person;
            const overdue = item.deadline && item.deadline < new Date().toISOString().slice(0, 10);
            const isPriority = dailyPriorities.some(p => p.itemId === item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {personLabel ? (
                    <div className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                      isWaiting ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/15 text-primary',
                    )}>
                      {initials(personLabel)}
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
                      <TargetIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {isPriority && <span className="text-[9px] px-1 rounded bg-primary/15 text-primary font-bold">HOJE</span>}
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                      {personLabel && <span>{isWaiting ? 'com' : 'para'} {personLabel}</span>}
                      <span data-mono>· {daysAgo(item.updatedAt)}</span>
                      {overdue && <span className="text-red-500 font-medium">· atrasado</span>}
                      {(item.blockedPeople ?? 0) > 0 && <span className="text-amber-600">· bloqueia {item.blockedPeople}</span>}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {isWaiting ? (
                    <button
                      onClick={() => nudge(item)}
                      className="h-8 w-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 flex items-center justify-center"
                      title="Cutucar / marcar retomado"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                  ) : !isPriority ? (
                    <button
                      onClick={() => promoteToPriority(item.id)}
                      className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center"
                      title="Adicionar às 3 prioridades"
                    >
                      <TargetIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => conclude(item.id)}
                    className="h-8 w-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center"
                    title="Concluir"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {buckets[tab].length > list.length && (
        <button
          onClick={() => navigate('/inbox')}
          className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground border-t border-surface-2"
        >
          Ver todos ({buckets[tab].length})
        </button>
      )}
    </section>
  );
}
