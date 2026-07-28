import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';

export function CardsTopCategories() {
  const { getCardsGlobalBreakdown } = useFinance();
  const rows = getCardsGlobalBreakdown(3);
  if (rows.length === 0) return null;
  const top = rows.slice(0, 8);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Onde você mais gasta · últimos 3 meses
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">{formatBRL(total)}</span>
      </div>

      <div className="space-y-2">
        {top.map(row => (
          <div key={row.categoryId || 'none'} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: row.color }} />
                <span className="text-foreground truncate">{row.name}</span>
                {row.deltaPct !== null && Math.abs(row.deltaPct) >= 5 && (
                  <span className={`text-[10px] shrink-0 ${row.deltaPct > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {row.deltaPct > 0 ? '↑' : '↓'}{Math.abs(row.deltaPct).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-semibold text-foreground">{formatBRL(row.total)}</span>
                <span className="text-[9.5px] text-muted-foreground ml-1">{row.pct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${row.pct}%`, background: row.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
