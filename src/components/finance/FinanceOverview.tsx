import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { FinScope, formatBRL } from '@/types/finance';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CalendarClock, CheckCircle2, Hourglass } from 'lucide-react';

interface Props { scope: FinScope; companyId: string | null; }

const EXPENSE_KINDS = new Set(['expense', 'card_payment', 'invoice_payment', 'employee_payment', 'supplier_payment', 'employee_loan', 'tax']);

export function FinanceOverview({ scope, companyId }: Props) {
  const { transactions, accounts, cards, accountBalance, cardOpenInvoice, getMonthTotals, getCategoryTotals, getUpcomingBills } = useFinance();
  const { monthISO, monthStart, isCurrentMonth, label } = useFinancePeriod();

  const filteredAccounts = useMemo(() => accounts.filter(a => {
    if (a.archived || a.scope !== scope) return false;
    if (scope === 'pj' && companyId !== 'all' && a.companyId !== companyId) return false;
    return true;
  }), [accounts, scope, companyId]);

  const filteredCards = useMemo(() => cards.filter(c => {
    if (c.archived || c.scope !== scope) return false;
    if (scope === 'pj' && companyId !== 'all' && c.companyId !== companyId) return false;
    return true;
  }), [cards, scope, companyId]);

  const totals = useMemo(() => getMonthTotals(monthISO), [getMonthTotals, monthISO]);
  const catTotals = useMemo(
    () => getCategoryTotals(monthISO).filter(c => c.total > 0).slice(0, 6),
    [getCategoryTotals, monthISO],
  );

  // Previous month comparison (only when viewing current month)
  const prevISO = useMemo(() => {
    const [y, m] = monthISO.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthISO]);
  const prevTotals = useMemo(() => getMonthTotals(prevISO), [getMonthTotals, prevISO]);

  // Overdue count/value (pending expenses before month start) — only meaningful when current
  const overdue = useMemo(() => {
    if (!isCurrentMonth) return { count: 0, value: 0, items: [] as typeof transactions };
    const items = transactions.filter(
      t => t.status === 'pending' && EXPENSE_KINDS.has(t.kind) && t.occurredOn < monthStart,
    ).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    return { count: items.length, value: items.reduce((s, t) => s + t.amount, 0), items };
  }, [transactions, isCurrentMonth, monthStart]);

  const upcoming = useMemo(
    () => (isCurrentMonth ? getUpcomingBills(7).slice(0, 5) : []),
    [getUpcomingBills, isCurrentMonth],
  );

  const totalBalance = filteredAccounts.reduce((s, a) => s + accountBalance(a.id), 0);
  const totalCardInvoice = filteredCards.reduce((s, c) => s + cardOpenInvoice(c.id), 0);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };
  const expensePct = pctChange(totals.pago, prevTotals.pago);
  const maxCat = catTotals[0]?.total || 0;

  return (
    <div className="space-y-3">
      {/* Saldo total */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90 mb-1">
          <Wallet className="h-3.5 w-3.5" /> Saldo total (contas)
        </div>
        <div className="text-2xl font-bold">{formatBRL(totalBalance)}</div>
        {totalCardInvoice > 0 && (
          <div className="text-[11px] opacity-80 mt-1">
            Fatura aberta nos cartões: {formatBRL(totalCardInvoice)}
          </div>
        )}
      </div>

      {/* Cabeçalho do mês */}
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground pl-1">{label}</div>

      {/* Pago / Recebido */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <TrendingUp className="h-3 w-3" /> Recebido
          </div>
          <div className="text-base font-bold text-foreground mt-1 tabular-nums">{formatBRL(totals.recebido)}</div>
          {totals.aReceber > 0 && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              A receber: <span className="tabular-nums">{formatBRL(totals.aReceber)}</span>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            <TrendingDown className="h-3 w-3" /> Pago
          </div>
          <div className="text-base font-bold text-foreground mt-1 tabular-nums">{formatBRL(totals.pago)}</div>
          {expensePct !== null && Math.abs(expensePct) >= 1 && (
            <div className={`text-[10px] mt-0.5 ${expensePct > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {expensePct > 0 ? '+' : ''}{expensePct.toFixed(0)}% vs mês anterior
            </div>
          )}
        </div>
      </div>

      {/* Resultado + A pagar */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Resultado
          </div>
          <div className={`text-base font-bold mt-1 tabular-nums ${totals.saldo < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
            {totals.saldo >= 0 ? '+' : ''}{formatBRL(totals.saldo)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            <Hourglass className="h-3 w-3" /> A pagar
          </div>
          <div className="text-base font-bold text-foreground mt-1 tabular-nums">{formatBRL(totals.aPagar)}</div>
        </div>
      </div>

      {/* Vencidas (somente mês corrente) */}
      {overdue.count > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Vencidas
            </h3>
            <span className="text-xs font-bold text-destructive tabular-nums">
              {overdue.count} · {formatBRL(overdue.value)}
            </span>
          </div>
          {overdue.items.slice(0, 4).map(t => (
            <div key={t.id} className="flex justify-between text-xs">
              <span className="text-foreground truncate">{t.description}</span>
              <span className="text-destructive font-bold tabular-nums shrink-0 ml-2">{formatBRL(t.amount)}</span>
            </div>
          ))}
          {overdue.count > 4 && (
            <div className="text-[10px] text-muted-foreground">+{overdue.count - 4} outras</div>
          )}
        </div>
      )}

      {/* Top categorias do mês */}
      {catTotals.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top categorias</h3>
          <div className="space-y-2">
            {catTotals.map(c => {
              const pct = maxCat > 0 ? (c.total / maxCat) * 100 : 0;
              return (
                <div key={c.categoryId ?? 'none'} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium truncate flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatBRL(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos 7 dias (somente mês corrente) */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Próximos 7 dias
          </h3>
          {upcoming.map(t => (
            <div key={t.id} className="flex justify-between text-xs">
              <span className="text-foreground truncate">{t.description}</span>
              <span className="text-foreground font-bold tabular-nums shrink-0 ml-2">{formatBRL(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {filteredAccounts.length === 0 && filteredCards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
          Comece cadastrando uma conta bancária ou cartão para registrar lançamentos.
        </div>
      )}
    </div>
  );
}
