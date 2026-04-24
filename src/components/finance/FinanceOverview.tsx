import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { FinScope, formatBRL } from '@/types/finance';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';

interface Props { scope: FinScope; companyId: string | null; }

const INCOMING = new Set(['income', 'receivable', 'bank_loan']);
const TRANSFER = new Set(['transfer', 'inter_company']);

export function FinanceOverview({ scope, companyId }: Props) {
  const { transactions, accounts, cards, categories, accountBalance, cardOpenInvoice } = useFinance();

  const filteredTx = useMemo(() => transactions.filter(t => {
    if (t.scope !== scope) return false;
    if (scope === 'pj' && companyId !== 'all' && t.companyId !== companyId) return false;
    return true;
  }), [transactions, scope, companyId]);

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

  // Current month bounds
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  // Previous month
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const txInMonth = filteredTx.filter(t => t.status === 'confirmed' && t.occurredOn >= monthStartStr && t.occurredOn <= monthEndStr);
  const txInPrev = filteredTx.filter(t => t.status === 'confirmed' && t.occurredOn >= prevStart.toISOString().slice(0, 10) && t.occurredOn <= prevEnd.toISOString().slice(0, 10));

  const incomeMonth = txInMonth.filter(t => INCOMING.has(t.kind)).reduce((s, t) => s + t.amount, 0);
  const expenseMonth = txInMonth.filter(t => !INCOMING.has(t.kind) && !TRANSFER.has(t.kind)).reduce((s, t) => s + t.amount, 0);
  const incomePrev = txInPrev.filter(t => INCOMING.has(t.kind)).reduce((s, t) => s + t.amount, 0);
  const expensePrev = txInPrev.filter(t => !INCOMING.has(t.kind) && !TRANSFER.has(t.kind)).reduce((s, t) => s + t.amount, 0);

  const totalBalance = filteredAccounts.reduce((s, a) => s + accountBalance(a.id), 0);
  const totalCardInvoice = filteredCards.reduce((s, c) => s + cardOpenInvoice(c.id), 0);

  // Top categories of expense in month
  const byCategory: Record<string, number> = {};
  txInMonth.filter(t => !INCOMING.has(t.kind) && !TRANSFER.has(t.kind) && t.categoryId).forEach(t => {
    byCategory[t.categoryId!] = (byCategory[t.categoryId!] || 0) + t.amount;
  });
  const topCats = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, amount]) => ({ cat: categories.find(c => c.id === id), amount }))
    .filter(x => x.cat);

  // Spending per card in month
  const cardSpend = filteredCards.map(c => {
    const total = txInMonth.filter(t => t.cardId === c.id && !INCOMING.has(t.kind)).reduce((s, t) => s + t.amount, 0);
    return { card: c, total };
  }).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // Upcoming pending in 7 days
  const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const upcoming = filteredTx.filter(t => t.status === 'pending' && t.occurredOn >= now.toISOString().slice(0, 10) && t.occurredOn <= in7Str)
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

  const balanceMonth = incomeMonth - expenseMonth;
  const balancePrev = incomePrev - expensePrev;

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return null;
    return ((current - prev) / Math.abs(prev)) * 100;
  };

  const expensePct = pctChange(expenseMonth, expensePrev);

  return (
    <div className="space-y-3">
      {/* Saldo total */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90 mb-1">
          <Wallet className="h-3.5 w-3.5" /> Saldo total
        </div>
        <div className="text-2xl font-bold">{formatBRL(totalBalance)}</div>
        {totalCardInvoice > 0 && (
          <div className="text-[11px] opacity-80 mt-1">
            Fatura aberta nos cartões: {formatBRL(totalCardInvoice)}
          </div>
        )}
      </div>

      {/* Mês corrente */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <TrendingUp className="h-3 w-3" /> Entradas
          </div>
          <div className="text-base font-bold text-foreground mt-1">{formatBRL(incomeMonth)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            <TrendingDown className="h-3 w-3" /> Saídas
          </div>
          <div className="text-base font-bold text-foreground mt-1">{formatBRL(expenseMonth)}</div>
          {expensePct !== null && Math.abs(expensePct) >= 1 && (
            <div className={`text-[10px] mt-0.5 ${expensePct > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {expensePct > 0 ? '+' : ''}{expensePct.toFixed(0)}% vs mês anterior
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado do mês</div>
        <div className={`text-lg font-bold mt-1 ${balanceMonth < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
          {balanceMonth >= 0 ? '+' : ''}{formatBRL(balanceMonth)}
        </div>
      </div>

      {/* Top categorias */}
      {topCats.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top categorias do mês</h3>
          <div className="space-y-2">
            {topCats.map(({ cat, amount }) => {
              const pct = expenseMonth > 0 ? (amount / expenseMonth) * 100 : 0;
              return (
                <div key={cat!.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium truncate flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: cat!.color }} />
                      {cat!.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatBRL(amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: cat!.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gasto por cartão */}
      {cardSpend.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gasto por cartão (mês)</h3>
          {cardSpend.map(({ card, total }) => (
            <div key={card.id} className="flex justify-between items-center text-xs">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: card.color }} />
                {card.name}
              </span>
              <span className="text-foreground font-bold tabular-nums">{formatBRL(total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Próximos vencimentos */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Próximos 7 dias
          </h3>
          {upcoming.slice(0, 5).map(t => (
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
