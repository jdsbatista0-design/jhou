import { useCentral } from '@/contexts/CentralContext';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ArrowUpRight, Inbox } from 'lucide-react';
import { Item } from '@/types/central';

function score(item: Item): number {
  // Higher = more urgent to nudge someone
  const impact = item.impactScore ?? 0;
  const blockers = item.blockedPeople ?? 0;
  const overdueBonus = item.deadline && item.deadline < new Date().toISOString().slice(0, 10) ? 100 : 0;
  return impact * 10 + blockers * 25 + overdueBonus;
}

export default function HomePending() {
  const { items } = useCentral();
  const navigate = useNavigate();

  const { theyOweMe, iOwe } = useMemo(() => {
    const open = items.filter(i => i.fase !== 'Concluído' && !i.recurrenceId);
    const theyOweMe = open
      .filter(i => i.kind === 'waiting_someone')
      .sort((a, b) => score(b) - score(a))
      .slice(0, 5);
    const iOwe = open
      .filter(i => i.kind === 'my_action' || i.kind === 'my_decision')
      .sort((a, b) => score(b) - score(a))
      .slice(0, 5);
    return { theyOweMe, iOwe };
  }, [items]);

  if (theyOweMe.length === 0 && iOwe.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-3">
      {theyOweMe.length > 0 && (
        <div className="rounded-xl border border-surface-2 bg-surface p-3">
          <div className="flex items-center gap-2 mb-2">
            <UserRound className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Me devem resposta</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{theyOweMe.length}</span>
          </div>
          <div className="space-y-1">
            {theyOweMe.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{item.title}</div>
                  {item.waitingFor && (
                    <div className="text-[11px] text-muted-foreground truncate">com {item.waitingFor}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {iOwe.length > 0 && (
        <div className="rounded-xl border border-surface-2 bg-surface p-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Devo resposta</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{iOwe.length}</span>
          </div>
          <div className="space-y-1">
            {iOwe.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{item.title}</div>
                  {item.blockedPeople && item.blockedPeople > 0 ? (
                    <div className="text-[11px] text-amber-600">bloqueia {item.blockedPeople} pessoa(s)</div>
                  ) : item.person ? (
                    <div className="text-[11px] text-muted-foreground truncate">para {item.person}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
