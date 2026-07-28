import { CreditCard, CalendarClock, Layers, TrendingUp } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';

export function CardsSummary() {
  const { getCardsSummary } = useFinance();
  const s = getCardsSummary();

  if (s.cardsCount === 0) return null;

  const dueLabel = s.nextDue
    ? s.nextDue.daysUntil <= 0
      ? 'Vence hoje'
      : s.nextDue.daysUntil === 1
        ? 'em 1 dia'
        : `em ${s.nextDue.daysUntil} dias`
    : '—';

  const utilTone =
    s.utilization > 80 ? 'bg-destructive' :
    s.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Panorama · {s.cardsCount} {s.cardsCount === 1 ? 'cartão' : 'cartões'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Em aberto agora</div>
          <div className="text-lg font-bold text-foreground font-mono leading-tight">{formatBRL(s.totalOpen)}</div>
          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${utilTone}`} style={{ width: `${s.utilization}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {s.utilization.toFixed(0)}% do limite ({formatBRL(s.totalLimit)})
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            <Layers className="h-2.5 w-2.5" /> Em parcelas
          </div>
          <div className="text-lg font-bold text-foreground font-mono leading-tight">{formatBRL(s.inInstallments)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">a pagar até o fim</div>
        </div>
      </div>

      {s.nextDue && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 p-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: s.nextDue.color + '22' }}>
            <CalendarClock className="h-4 w-4" style={{ color: s.nextDue.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Próximo vencimento</div>
            <div className="text-xs font-semibold text-foreground truncate">
              {s.nextDue.cardName} · {dueLabel}
            </div>
          </div>
          <div className="text-sm font-bold text-foreground font-mono">{formatBRL(s.nextDue.amount)}</div>
        </div>
      )}
    </div>
  );
}
