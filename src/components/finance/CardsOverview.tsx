import { useMemo } from 'react';
import { CalendarClock, Layers, CreditCard } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL, FinScope } from '@/types/finance';

interface Props { scope: FinScope; companyId: string | null; }

/**
 * Bloco topo da aba Cartões: responde 3 perguntas em 1 tela —
 * quanto devo agora, quando vence a próxima, quanto está preso em parcelas.
 */
export function CardsOverview({ scope, companyId }: Props) {
  const { cards, getCardStatement, getCardActiveInstallments } = useFinance();

  const data = useMemo(() => {
    const now = new Date();
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const visible = cards.filter(c => !c.archived && c.scope === scope &&
      (scope === 'pf' || companyId === 'all' || c.companyId === companyId));

    let totalDue = 0, totalLimit = 0, installments = 0;
    let nextDue: { name: string; color: string; amount: number; days: number } | null = null;

    for (const c of visible) {
      totalLimit += c.limitAmount || 0;
      const st = getCardStatement(c.id, monthISO);
      totalDue += st.remaining;
      if (st.due && st.remaining > 0) {
        const days = Math.round((new Date(st.due + 'T00:00:00').getTime() - today.getTime()) / 86400000);
        if (!nextDue || days < nextDue.days) {
          nextDue = { name: c.name, color: c.color, amount: st.remaining, days };
        }
      }
      for (const p of getCardActiveInstallments(c.id)) {
        installments += p.installmentAmount * p.remaining;
      }
    }
    const utilization = totalLimit > 0 ? Math.min(100, (totalDue / totalLimit) * 100) : 0;
    return { count: visible.length, monthISO, totalDue, totalLimit, utilization, installments, nextDue };
  }, [cards, scope, companyId, getCardStatement, getCardActiveInstallments]);

  if (data.count === 0) return null;

  const monthLabel = (() => {
    const [y, m] = data.monthISO.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  })();

  const dueLabel = data.nextDue
    ? data.nextDue.days < 0 ? `atrasada há ${Math.abs(data.nextDue.days)}d`
      : data.nextDue.days === 0 ? 'vence hoje'
      : `em ${data.nextDue.days} ${data.nextDue.days === 1 ? 'dia' : 'dias'}`
    : null;

  const tone = data.utilization > 80 ? 'bg-destructive'
    : data.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          <span>A pagar em {monthLabel}</span>
        </div>
        <div className="text-3xl font-bold font-mono text-foreground leading-tight">
          {formatBRL(data.totalDue)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {data.count} {data.count === 1 ? 'cartão' : 'cartões'} · {data.utilization.toFixed(0)}% de {formatBRL(data.totalLimit)} de limite
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full transition-all ${tone}`} style={{ width: `${data.utilization}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/40 p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3 w-3" /> Próximo vencimento
          </div>
          {data.nextDue ? (
            <>
              <div className="text-sm font-bold font-mono text-foreground leading-tight mt-0.5">
                {formatBRL(data.nextDue.amount)}
              </div>
              <div className="text-[10.5px] text-muted-foreground truncate">
                {data.nextDue.name} · {dueLabel}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground mt-0.5">Nada a pagar</div>
          )}
        </div>

        <div className="rounded-xl bg-muted/40 p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3 w-3" /> Parcelas futuras
          </div>
          <div className="text-sm font-bold font-mono text-foreground leading-tight mt-0.5">
            {formatBRL(data.installments)}
          </div>
          <div className="text-[10.5px] text-muted-foreground">restam a pagar</div>
        </div>
      </div>
    </div>
  );
}
