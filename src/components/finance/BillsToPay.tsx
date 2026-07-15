import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { FinScope, FinTransaction, formatBRL } from '@/types/finance';
import { Check, Trash2, AlertCircle, CalendarDays, Pencil, CheckCircle2, Search, Repeat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TransactionDialog } from './TransactionDialog';

interface Props { scope: FinScope; companyId: string | null; }


type Tab = 'pending' | 'paid';

const todayYMD = () => new Date().toISOString().slice(0, 10);
const endOfMonthYMD = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};
const endOfWeekYMD = () => {
  const d = new Date();
  const days = 7 - d.getDay();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return end.toISOString().slice(0, 10);
};

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// Show only expense-style pendings (no incoming, no transfers)
const BILL_KINDS = new Set([
  'expense', 'card_payment', 'invoice_payment', 'employee_payment',
  'supplier_payment', 'employee_loan', 'tax',
]);

export function BillsToPay({ scope, companyId }: Props) {
  const {
    transactions, accounts, cards, categories, companies,
    updateTransaction, deleteTransaction,
  } = useFinance();
  const { monthStart, monthEnd, isCurrentMonth } = useFinancePeriod();

  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FinTransaction | null>(null);

  const today = todayYMD();
  const weekEnd = endOfWeekYMD();

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);

  const scoped = useMemo(() => transactions
    .filter(t => t.scope === scope)
    .filter(t => scope !== 'pj' || companyId === 'all' || t.companyId === companyId)
    .filter(t => BILL_KINDS.has(t.kind)),
  [transactions, scope, companyId]);

  // Escopo do período selecionado — pendentes no mês + vencidas de meses anteriores (só no mês corrente)
  const inSelectedPeriod = (t: FinTransaction, tabKey: Tab) => {
    const inMonth = t.occurredOn >= monthStart && t.occurredOn <= monthEnd;
    if (tabKey === 'pending') {
      const overdueCarry = isCurrentMonth && t.status === 'pending' && t.occurredOn < monthStart;
      return inMonth || overdueCarry;
    }
    return inMonth;
  };

  const list = useMemo(() => {
    const base = scoped
      .filter(t => (tab === 'pending' ? t.status === 'pending' : t.status === 'confirmed'))
      .filter(t => inSelectedPeriod(t, tab));
    const filtered = search.trim()
      ? base.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
      : base;
    return filtered.sort((a, b) =>
      tab === 'pending'
        ? a.occurredOn.localeCompare(b.occurredOn)
        : b.occurredOn.localeCompare(a.occurredOn),
    );
  }, [scoped, tab, search, monthStart, monthEnd, isCurrentMonth]);

  // Buckets for pending
  const buckets = useMemo(() => {
    if (tab !== 'pending') return null;
    const atrasadas: FinTransaction[] = [];
    const hoje: FinTransaction[] = [];
    const semana: FinTransaction[] = [];
    const mes: FinTransaction[] = [];
    const proximas: FinTransaction[] = [];
    list.forEach(t => {
      if (t.occurredOn < today) atrasadas.push(t);
      else if (t.occurredOn === today) hoje.push(t);
      else if (t.occurredOn <= weekEnd) semana.push(t);
      else if (t.occurredOn <= monthEnd) mes.push(t);
      else proximas.push(t);
    });
    return { atrasadas, hoje, semana, mes, proximas };
  }, [list, tab, today, weekEnd, monthEnd]);

  const totals = useMemo(() => {
    const pendingScope = scoped.filter(t => t.status === 'pending' && inSelectedPeriod(t, 'pending'));
    const overdue = pendingScope.filter(t => t.occurredOn < today).reduce((s, t) => s + t.amount, 0);
    const month = pendingScope.reduce((s, t) => s + t.amount, 0);
    const overdueCount = pendingScope.filter(t => t.occurredOn < today).length;
    return { overdue, month, overdueCount };
  }, [scoped, today, monthStart, monthEnd, isCurrentMonth]);

  const handlePay = (t: FinTransaction) => {
    updateTransaction(t.id, { status: 'confirmed' });
    toast.success(`Pago em ${new Date().toLocaleDateString('pt-BR')}`, {

      action: { label: 'Desfazer', onClick: () => updateTransaction(t.id, { status: 'pending' }) },
    });
  };

  const handlePayAll = (items: FinTransaction[]) => {
    if (items.length === 0) return;
    items.forEach(t => updateTransaction(t.id, { status: 'confirmed' }));
    toast.success(`${items.length} conta${items.length > 1 ? 's' : ''} marcada${items.length > 1 ? 's' : ''} como paga${items.length > 1 ? 's' : ''}`);
  };

  const renderRow = (t: FinTransaction, isOverdue = false) => {
    const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const acc = t.accountId ? accountMap.get(t.accountId) : null;
    const card = t.cardId ? cardMap.get(t.cardId) : null;
    const company = t.companyId ? companyMap.get(t.companyId) : null;
    const isPending = t.status === 'pending';

    return (
      <div
        key={t.id}
        className={cn(
          'rounded-xl border bg-card p-3 transition-colors',
          isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-border',
        )}
      >
        <div className="flex items-center gap-3">
          {isPending && (
            <button
              onClick={() => handlePay(t)}
              className={cn(
                'h-9 w-9 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all hover:scale-105',
                isOverdue
                  ? 'border-destructive/50 hover:bg-destructive hover:border-destructive hover:text-white'
                  : 'border-emerald-500/40 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white',
              )}
              title="Marcar como pago"
            >
              <Check className={cn('h-4 w-4', isOverdue ? 'text-destructive' : 'text-emerald-500')} />
            </button>
          )}
          {!isPending && (
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          )}

          <button
            onClick={() => setEditing(t)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {t.description}
              </span>
              {t.recurrenceId && <Repeat className="h-3 w-3 text-primary shrink-0" />}
            </div>
            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 font-mono">
              <span>{fmtDate(t.occurredOn)}</span>
              {[
                cat?.name,
                card?.name || acc?.name,
                company?.name && scope === 'pj' && companyId === 'all' ? company.name : null,
              ].filter(Boolean).map((s, i) => (
                <span key={i}>· {s}</span>
              ))}
            </div>
          </button>

          <div className="text-right shrink-0">
            <div className={cn(
              'text-sm font-bold font-mono',
              isPending ? 'text-foreground' : 'text-muted-foreground line-through',
            )}>
              {formatBRL(t.amount).replace('R$', '').trim()}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(t)}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent flex items-center justify-center transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deleteTransaction(t.id); toast.success('Excluído'); }}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  const renderBucket = (label: string, items: FinTransaction[], tone?: 'danger' | 'warning' | 'muted') => {
    if (items.length === 0) return null;
    const sum = items.reduce((s, t) => s + t.amount, 0);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className={cn(
            'text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5',
            tone === 'danger' && 'text-destructive',
            tone === 'warning' && 'text-amber-500',
            tone === 'muted' && 'text-muted-foreground',
            !tone && 'text-foreground',
          )}>
            {tone === 'danger' && <AlertCircle className="h-3 w-3" />}
            {label}
            <span className="text-[10px] opacity-60 font-medium">({items.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold font-mono text-destructive">
              {formatBRL(sum).replace('R$', '').trim()}
            </span>
            {items.length > 1 && (
              <button
                onClick={() => handlePayAll(items)}
                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 uppercase tracking-wide"
                title="Marcar todas como pagas"
              >
                Pagar todas
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          {items.map(t => renderRow(t, tone === 'danger'))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-2xl border p-3',
          totals.overdueCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border',
        )}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Atrasadas
          </div>
          <div className={cn(
            'text-lg font-bold font-mono mt-1',
            totals.overdueCount > 0 ? 'text-destructive' : 'text-foreground',
          )}>
            {formatBRL(totals.overdue).replace('R$', '').trim()}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {totals.overdueCount} conta{totals.overdueCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Mês
          </div>
          <div className="text-lg font-bold font-mono text-foreground mt-1">
            {formatBRL(totals.month).replace('R$', '').trim()}
          </div>
          <div className="text-[10px] text-muted-foreground">Total a pagar</div>
        </div>
      </div>

      {/* Quick-add removido — use o botão "Novo lançamento" no topo da página */}


      {/* Tabs */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab('pending')}
          className={cn(
            'flex-1 h-10 rounded-xl border text-xs font-semibold transition-colors',
            tab === 'pending'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          A pagar
        </button>
        <button
          onClick={() => setTab('paid')}
          className={cn(
            'flex-1 h-10 rounded-xl border text-xs font-semibold transition-colors',
            tab === 'paid'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          Pagas
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar conta"
          className="rounded-xl h-9 text-sm pl-8"
        />
      </div>

      {/* Lista */}
      {list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-foreground font-semibold">
            {tab === 'pending' ? 'Nenhuma conta a pagar 🎉' : 'Nenhuma conta paga ainda.'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {tab === 'pending'
              ? 'Adicione contas acima para acompanhar aqui.'
              : 'Marque as contas como pagas para vê-las aqui.'}
          </p>
        </div>
      )}

      {tab === 'pending' && buckets && (
        <div className="space-y-3">
          {renderBucket('Atrasadas', buckets.atrasadas, 'danger')}
          {renderBucket('Hoje', buckets.hoje, 'warning')}
          {renderBucket('Esta semana', buckets.semana)}
          {renderBucket('Ainda este mês', buckets.mes)}
          {renderBucket('Próximas', buckets.proximas, 'muted')}
        </div>
      )}

      {tab === 'paid' && (
        <div className="space-y-1.5">
          {list.map(t => renderRow(t))}
        </div>
      )}

      <TransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        scope={scope}
        companyId={companyId}
        editTransaction={editing}
      />
    </div>
  );
}
