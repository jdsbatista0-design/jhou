import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';

import { useFinance } from '@/contexts/FinanceContext';
import { FinancePeriodProvider, useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/types/finance';
import { cn } from '@/lib/utils';

const BillsToPay = lazy(() => import('@/components/finance/BillsToPay').then(m => ({ default: m.BillsToPay })));
const TransactionsList = lazy(() => import('@/components/finance/TransactionsList').then(m => ({ default: m.TransactionsList })));
const FinanceOverview = lazy(() => import('@/components/finance/FinanceOverview').then(m => ({ default: m.FinanceOverview })));
const CategoryBudgets = lazy(() => import('@/components/finance/CategoryBudgets').then(m => ({ default: m.CategoryBudgets })));
const SavingsInsights = lazy(() => import('@/components/finance/SavingsInsights').then(m => ({ default: m.SavingsInsights })));
const TransactionDialog = lazy(() => import('@/components/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })));

type View = 'bills' | 'all' | 'overview' | 'categories' | 'savings';

const VIEWS: { id: View; label: string }[] = [
  { id: 'bills', label: 'A pagar' },
  { id: 'all', label: 'Lançamentos' },
  { id: 'overview', label: 'Resumo' },
  { id: 'categories', label: 'Categorias' },
  { id: 'savings', label: 'Economizar' },
];

const shiftISO = (monthISO: string, delta: number) => {
  const [y, m] = monthISO.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtDay = (ymd: string) =>
  new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const BILL_KINDS = new Set([
  'expense', 'card_payment', 'invoice_payment', 'employee_payment',
  'supplier_payment', 'employee_loan', 'tax',
]);

/** Painel dominante: total do mês, pago, restante e o próximo vencimento. */
function MonthPanel() {
  const { transactions, cards, getCardStatement } = useFinance();
  const { monthStart, monthEnd, isCurrentMonth } = useFinancePeriod();
  const today = new Date().toISOString().slice(0, 10);

  const data = useMemo(() => {
    const bills = transactions
      .filter(t => t.scope === 'pf' && BILL_KINDS.has(t.kind))
      // Compras feitas no cartão não são contas do mês — elas entram na fatura
      .filter(t => !(t.cardId && t.kind !== 'card_payment' && t.kind !== 'invoice_payment'));

    const inMonth = bills.filter(t => t.occurredOn >= monthStart && t.occurredOn <= monthEnd);
    const carry = isCurrentMonth
      ? bills.filter(t => t.status === 'pending' && t.occurredOn < monthStart)
      : [];

    const paid = inMonth.filter(t => t.status === 'confirmed').reduce((s, t) => s + t.amount, 0);
    let pending = [...inMonth.filter(t => t.status === 'pending'), ...carry]
      .reduce((s, t) => s + t.amount, 0);

    // Faturas de cartão do período (valor que ainda falta pagar)
    const selectedISO = monthStart.slice(0, 7);
    const deltas = isCurrentMonth ? [-4, -3, -2, -1] : [-1];
    let next: { label: string; dueOn: string; amount: number } | null = null;
    for (const c of cards.filter(c => !c.archived && c.scope === 'pf')) {
      for (const d of deltas) {
        const st = getCardStatement(c.id, shiftISO(selectedISO, d));
        if (!st.due || st.remaining <= 0.009) continue;
        if (st.due > monthEnd) continue;
        if (d !== -1 && st.due >= monthStart) continue;
        pending += st.remaining;
        if (!next || st.due < next.dueOn) next = { label: `Fatura ${c.name}`, dueOn: st.due, amount: st.remaining };
      }
    }

    const upcoming = [...inMonth.filter(t => t.status === 'pending'), ...carry]
      .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))[0];
    if (upcoming && (!next || upcoming.occurredOn < next.dueOn)) {
      next = { label: upcoming.description, dueOn: upcoming.occurredOn, amount: upcoming.amount };
    }

    return { total: paid + pending, paid, pending, next };
  }, [transactions, cards, getCardStatement, monthStart, monthEnd, isCurrentMonth]);

  const nextTone = data.next && data.next.dueOn < today;

  return (
    <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-panel">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70">Total do mês</p>
          <p className="font-display text-xl font-bold mt-0.5" data-mono>{formatBRL(data.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70">Já pago</p>
          <p className="font-display text-xl font-bold mt-0.5" data-mono>{formatBRL(data.paid)}</p>
        </div>
      </div>

      <div className="h-px bg-primary-foreground/15 my-4" />

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70">Falta pagar</p>
          <p className="font-display text-3xl font-bold leading-tight" data-mono>{formatBRL(data.pending)}</p>
        </div>
        {data.next && (
          <div
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight max-w-[52%] truncate',
              nextTone ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/15',
            )}
            title={`${data.next.label} · ${fmtDay(data.next.dueOn)}`}
          >
            {nextTone ? 'Atrasado' : 'Próxima'} · {fmtDay(data.next.dueOn)}
          </div>
        )}
      </div>
      {data.next && (
        <p className="text-[11px] opacity-75 mt-1.5 truncate">{data.next.label}</p>
      )}
    </div>
  );
}

const SectionFallback = () => (
  <div className="text-[11px] text-muted-foreground animate-pulse pt-3">Carregando…</div>
);

function BillsInner() {
  const { scope, setScope } = useFinance();
  const [view, setView] = useState<View>('bills');
  const [txOpen, setTxOpen] = useState(false);

  useEffect(() => {
    if (scope !== 'pf') setScope('pf');
  }, [scope, setScope]);

  return (
    <div className="space-y-4">
      <MonthNavigator />
      <MonthPanel />

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold transition-colors',
              view === v.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border text-muted-foreground',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Button onClick={() => setTxOpen(true)} className="w-full h-12 rounded-2xl font-semibold">
        <Plus className="h-4 w-4 mr-1.5" /> Nova conta ou receita
      </Button>

      <div className="pt-1">
        <Suspense fallback={<SectionFallback />}>
          {view === 'bills' && <BillsToPay scope="pf" companyId={null} />}
          {view === 'all' && <TransactionsList scope="pf" companyId={null} />}
          {view === 'overview' && <FinanceOverview scope="pf" companyId={null} />}
          {view === 'categories' && <CategoryBudgets scope="pf" />}
          {view === 'savings' && <SavingsInsights />}
        </Suspense>
      </div>

      {txOpen && (
        <Suspense fallback={null}>
          <TransactionDialog open={txOpen} onClose={() => setTxOpen(false)} scope="pf" companyId={null} />
        </Suspense>
      )}
    </div>
  );
}

export default function BillsPage() {
  return (
    <FinancePeriodProvider>
      <BillsInner />
    </FinancePeriodProvider>
  );
}
