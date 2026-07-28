import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';

export function CardsForecast() {
  const { getCardsForecast } = useFinance();
  const rows = getCardsForecast(6);
  const [expanded, setExpanded] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map(r => r.total));

  const anyValue = rows.some(r => r.total > 0);
  if (!anyValue) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Próximos 6 meses
        </span>
        <span className="text-[10px] text-muted-foreground">
          Total: {formatBRL(rows.reduce((s, r) => s + r.total, 0))}
        </span>
      </div>

      <div className="space-y-1">
        {rows.map(r => {
          const isOpen = expanded === r.monthISO;
          const pct = (r.total / max) * 100;
          return (
            <div key={r.monthISO} className="rounded-lg bg-muted/30">
              <button
                onClick={() => setExpanded(isOpen ? null : r.monthISO)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                disabled={r.total === 0}
              >
                <div className="w-14 text-[11px] font-semibold text-foreground capitalize shrink-0">
                  {r.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${r.isPeak ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right text-[11px] font-mono font-semibold text-foreground shrink-0">
                  {r.total > 0 ? formatBRL(r.total) : <span className="text-muted-foreground">—</span>}
                </div>
                {r.isPeak && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                {r.total > 0 && (isOpen
                  ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </button>
              {isOpen && r.perCard.length > 0 && (
                <div className="px-2 pb-2 space-y-1 border-t border-border/40 pt-1.5">
                  {r.perCard.map(pc => (
                    <div key={pc.cardId} className="flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: pc.color }} />
                        <span className="text-foreground truncate">{pc.cardName}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{formatBRL(pc.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
