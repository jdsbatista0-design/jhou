import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileUp, Plus, ChevronDown, Settings2, Tags, Check } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatBRL, FinTransaction } from '@/types/finance';
import { cn } from '@/lib/utils';
import { isGeneralBillTransaction } from '@/lib/financeVisibility';
import { competenceForDueMonth, shiftMonthISO } from '@/lib/billsByDue';
import { maskBRLInput, parseBRLInput } from '@/lib/currency';
import { toast } from 'sonner';

const CardStatement = lazy(() => import('@/components/finance/CardStatement').then(m => ({ default: m.CardStatement })));
const ImportInvoiceDialog = lazy(() => import('@/components/finance/ImportInvoiceDialog').then(m => ({ default: m.ImportInvoiceDialog })));
const TransactionDialog = lazy(() => import('@/components/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })));
const QuickCategorize = lazy(() => import('@/components/finance/QuickCategorize').then(m => ({ default: m.QuickCategorize })));
const CardsManager = lazy(() => import('@/components/finance/CardsManager').then(m => ({ default: m.CardsManager })));
const CategoriesManager = lazy(() => import('@/components/finance/CategoriesManager').then(m => ({ default: m.CategoriesManager })));

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthName = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }) => {
  const [y, m] = iso.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', opts).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const dayLabel = (ymd: string) => new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

interface Bill {
  key: string; kind: 'card' | 'fixed';
  title: string; dueOn: string; amount: number; paid: boolean;
  cardId?: string; competence?: string; tx?: FinTransaction;
}

export default function MoneyPage() {
  const fin = useFinance();
  const { cards, transactions, categories, getCardStatement, getUncategorized, updateTransaction, addCardPayment, scope, setScope } = fin;
  useEffect(() => { if (scope !== 'pf') setScope('pf'); }, [scope, setScope]);

  const nowMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(nowMonth);
  const isNow = month === nowMonth;
  const today = todayISO();
  const active = useMemo(() => cards.filter(c => !c.archived && c.scope === 'pf'), [cards]);

  const [showPaid, setShowPaid] = useState(false);
  const [openInvoice, setOpenInvoice] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [payValue, setPayValue] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [importOpen, setImportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  /** Faturas e contas fixas que vencem no mês (e atrasadas, no mês atual). */
  const bills = useMemo<Bill[]>(() => {
    const out: Bill[] = [];
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    for (const c of active) {
      const months = isNow ? [-3, -2, -1, 0] : [0];
      for (const d of months) {
        const comp = competenceForDueMonth(shiftMonthISO(month, d), c.closingDay, c.dueDay);
        const st = getCardStatement(c.id, comp);
        if (!st.due || st.total <= 0.009) continue;
        const paid = st.remaining <= 0.009;
        if (d < 0 && paid) continue; // meses anteriores só se ainda estiverem em aberto
        out.push({ key: `card-${c.id}-${comp}`, kind: 'card', title: `Fatura ${c.name}`, dueOn: st.due,
          amount: paid ? st.total : st.remaining, paid, cardId: c.id, competence: comp });
      }
    }
    for (const t of transactions) {
      if (t.scope !== 'pf' || t.kind === 'income' || t.kind === 'receivable' || t.kind === 'transfer' || t.kind === 'card_payment') continue;
      if (!isGeneralBillTransaction(t)) continue;
      const inMonth = t.occurredOn >= start && t.occurredOn <= end;
      const overdue = isNow && t.status === 'pending' && t.occurredOn < start;
      if (!inMonth && !overdue) continue;
      out.push({ key: `tx-${t.id}`, kind: 'fixed', title: t.description, dueOn: t.occurredOn, amount: t.amount, paid: t.status === 'confirmed', tx: t });
    }
    return out.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }, [active, transactions, getCardStatement, month, isNow]);

  const open = bills.filter(b => !b.paid);
  const paid = bills.filter(b => b.paid);
  const totalOpen = open.reduce((s, b) => s + b.amount, 0);
  const totalPaid = paid.reduce((s, b) => s + b.amount, 0);
  const next = open[0];

  /** Próximos 6 meses por vencimento. */
  const ahead = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const iso = shiftMonthISO(nowMonth, i + 1);
    const amount = active.reduce((s, c) => {
      const st = getCardStatement(c.id, competenceForDueMonth(iso, c.closingDay, c.dueDay));
      return s + Math.max(0, st.total - st.paid);
    }, 0);
    return { iso, amount };
  }), [active, getCardStatement, nowMonth]);
  const maxAhead = Math.max(1, ...ahead.map(a => a.amount));

  /** Gastos do mês por categoria: compras das faturas que vencem no mês + contas fixas. */
  const spending = useMemo(() => {
    const txs: FinTransaction[] = [];
    for (const c of active) txs.push(...getCardStatement(c.id, competenceForDueMonth(month, c.closingDay, c.dueDay)).transactions);
    for (const b of bills) if (b.kind === 'fixed' && b.tx && b.dueOn.startsWith(month)) txs.push(b.tx);
    const by = new Map<string, number>();
    for (const t of txs) by.set(t.categoryId || 'none', (by.get(t.categoryId || 'none') || 0) + t.amount);
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const rows = [...by.entries()].map(([id, v]) => {
      const cat = categories.find(c => c.id === id);
      return { id, name: cat?.name || 'Sem categoria', color: cat?.color, value: v };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
    return { total, rows };
  }, [active, getCardStatement, month, bills, categories]);

  const uncategorized = getUncategorized();

  const startPay = (b: Bill) => {
    setPaying(b);
    setPayValue(maskBRLInput(String(Math.round(b.amount * 100))));
    setPayDate(b.dueOn < today ? today : b.dueOn > today ? today : b.dueOn);
  };
  const confirmPay = async () => {
    if (!paying) return;
    const amount = parseBRLInput(payValue);
    if (amount <= 0) { toast.error('Informe o valor pago.'); return; }
    if (paying.kind === 'card' && paying.cardId && paying.competence) {
      const card = active.find(c => c.id === paying.cardId);
      await addCardPayment({ scope: 'pf', cardId: paying.cardId, accountId: (card?.accountId || null) as any,
        amount, paidCardMonth: `${paying.competence}-01`, occurredOn: payDate, description: `Pagamento ${paying.title}` });
    } else if (paying.tx) {
      await updateTransaction(paying.tx.id, { status: 'confirmed', amount, occurredOn: payDate });
    }
    toast.success(`${paying.title} paga`);
    setPaying(null);
  };

  const BillRow = ({ b }: { b: Bill }) => {
    const late = !b.paid && b.dueOn < today;
    return (
      <div className={cn('flex items-center gap-3 rounded-2xl border bg-card p-4', late ? 'border-accent/50' : 'border-border', b.paid && 'opacity-70')}>
        <button className="flex-1 min-w-0 text-left" disabled={b.kind !== 'card'} onClick={() => b.kind === 'card' && setOpenInvoice(b)}
          aria-label={b.kind === 'card' ? `Abrir ${b.title}` : b.title}>
          <p className="font-semibold text-[15px] truncate">{b.title}</p>
          <p className={cn('text-xs mt-0.5', late ? 'text-accent font-semibold' : 'text-muted-foreground')}>
            {b.paid ? 'Paga' : late ? 'Atrasada' : 'Vence'} · {dayLabel(b.dueOn)}{b.kind === 'card' ? ' · ver compras' : ''}
          </p>
          <p className="font-display text-lg font-bold mt-1" data-mono>{formatBRL(b.amount)}</p>
        </button>
        {b.paid ? (
          <span className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-label="Paga"><Check className="h-5 w-5" /></span>
        ) : (
          <Button onClick={() => startPay(b)} className="h-11 rounded-full px-5 font-semibold shrink-0">Pagar</Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Mês */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Mês anterior" onClick={() => setMonth(m => shiftMonthISO(m, -1))}><ChevronLeft className="h-5 w-5" /></Button>
        <button onClick={() => setMonth(nowMonth)} className="font-display text-lg font-semibold">{monthName(month)}</button>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Próximo mês" onClick={() => setMonth(m => shiftMonthISO(m, 1))}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {/* Painel */}
      <section className="rounded-3xl bg-primary text-primary-foreground p-6 shadow-panel">
        <p className="text-xs uppercase tracking-widest font-semibold opacity-70">Falta pagar</p>
        <p className="font-display text-4xl font-bold mt-1" data-mono>{formatBRL(totalOpen)}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="opacity-80">Pago <b data-mono>{formatBRL(totalPaid)}</b></span>
          {next ? <span className="opacity-90">Próxima: {dayLabel(next.dueOn)}</span> : <span className="opacity-80">Tudo em dia</span>}
        </div>
      </section>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-14 rounded-2xl font-semibold" onClick={() => setImportOpen(true)}><FileUp className="h-5 w-5 mr-2" />Importar fatura</Button>
        <Button variant="outline" className="h-14 rounded-2xl font-semibold" onClick={() => setNewOpen(true)}><Plus className="h-5 w-5 mr-2" />Conta fixa</Button>
      </div>

      {/* A pagar */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">A pagar</h2>
        {open.length === 0 && <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground text-center">Nada a pagar neste mês.</p>}
        {open.map(b => <BillRow key={b.key} b={b} />)}
        {paid.length > 0 && (
          <>
            <button onClick={() => setShowPaid(v => !v)} className="w-full h-11 flex items-center justify-center gap-1 text-sm font-semibold text-muted-foreground">
              {showPaid ? 'Esconder pagas' : `Ver pagas (${paid.length})`}<ChevronDown className={cn('h-4 w-4 transition', showPaid && 'rotate-180')} />
            </button>
            {showPaid && paid.map(b => <BillRow key={b.key} b={b} />)}
          </>
        )}
      </section>

      {/* Próximos meses */}
      <section className="rounded-3xl bg-card border border-border p-5 space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Próximos meses</h2>
          <p className="text-xs text-muted-foreground">Parcelas que já vão cair nas faturas</p>
        </div>
        {ahead.map(a => (
          <button key={a.iso} onClick={() => setMonth(a.iso)} className="w-full text-left">
            <div className="flex justify-between text-sm"><span>{monthName(a.iso, { month: 'short', year: '2-digit' })}</span><b data-mono>{formatBRL(a.amount)}</b></div>
            <div className="h-2 rounded-full bg-surface-2 mt-1.5 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(a.amount / maxAhead) * 100}%` }} /></div>
          </button>
        ))}
      </section>

      {/* Onde gastei */}
      <section className="rounded-3xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Onde gastei</h2>
          <span className="text-sm font-semibold" data-mono>{formatBRL(spending.total)}</span>
        </div>
        {spending.rows.length === 0 && <p className="text-sm text-muted-foreground">Sem compras neste mês.</p>}
        {spending.rows.map(r => (
          <div key={r.id}>
            <div className="flex justify-between text-sm"><span className={cn(r.id === 'none' && 'text-muted-foreground')}>{r.name}</span><span data-mono>{formatBRL(r.value)}</span></div>
            <div className="h-2 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${spending.total ? (r.value / spending.total) * 100 : 0}%`, background: r.color || 'hsl(var(--muted-foreground))' }} />
            </div>
          </div>
        ))}
        {uncategorized.count > 0 && (
          <Button onClick={() => setClassifyOpen(true)} variant="secondary" className="w-full h-12 rounded-2xl font-semibold mt-2">
            <Tags className="h-4 w-4 mr-2" />Classificar {uncategorized.count} compras
          </Button>
        )}
      </section>

      <button onClick={() => setSetupOpen(true)} className="w-full h-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Settings2 className="h-4 w-4" />Cartões e categorias
      </button>

      {/* Fatura em tela cheia */}
      <Dialog open={!!openInvoice} onOpenChange={v => { if (!v) setOpenInvoice(null); }}>
        <DialogContent className="max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] overflow-y-auto rounded-none sm:rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{openInvoice?.title} · vence {openInvoice && dayLabel(openInvoice.dueOn)}</DialogTitle></DialogHeader>
          {openInvoice?.cardId && (
            <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
              <CardStatement key={openInvoice.key} cardId={openInvoice.cardId} initialMonthISO={openInvoice.competence} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagar */}
      <Sheet open={!!paying} onOpenChange={v => { if (!v) setPaying(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="text-left"><SheetTitle className="font-display text-lg">Pagar {paying?.title}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Valor pago</label>
              <Input inputMode="numeric" value={payValue} onChange={e => setPayValue(maskBRLInput(e.target.value))} className="h-14 rounded-2xl text-2xl font-display font-bold" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data do pagamento</label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-12 rounded-2xl" />
            </div>
            <Button onClick={confirmPay} className="w-full h-14 rounded-2xl text-base font-semibold">Confirmar pagamento</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cartões e categorias */}
      <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-10">
          <SheetHeader className="text-left"><SheetTitle className="font-display text-lg">Cartões e categorias</SheetTitle></SheetHeader>
          <Suspense fallback={null}>
            <div className="mt-4 space-y-8">
              <CardsManager scope="pf" companyId={null} onOpenCard={() => {}} />
              <CategoriesManager scope="pf" />
            </div>
          </Suspense>
        </SheetContent>
      </Sheet>

      <Suspense fallback={null}>
        {importOpen && <ImportInvoiceDialog open={importOpen} onClose={() => setImportOpen(false)} />}
        {newOpen && <TransactionDialog open={newOpen} onClose={() => setNewOpen(false)} scope="pf" companyId={null} />}
        {classifyOpen && <QuickCategorize open={classifyOpen} onClose={() => setClassifyOpen(false)} />}
      </Suspense>
    </div>
  );
}
