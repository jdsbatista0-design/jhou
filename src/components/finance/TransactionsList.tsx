import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { FinScope, FinTransaction, formatBRL } from '@/types/finance';
import { Trash2, ArrowDown, ArrowUp, ArrowLeftRight, Check, Search, Repeat, Pencil, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TransactionDialog } from './TransactionDialog';

interface Props { scope: FinScope; companyId: string | null; }

const INCOMING_KINDS = new Set(['income', 'receivable', 'bank_loan']);
const TRANSFER_KINDS = new Set(['transfer', 'inter_company']);

type QuickFilter = 'todo_mes' | 'pagas' | 'tudo';

const todayYMD = () => new Date().toISOString().slice(0, 10);
const endOfWeekYMD = () => {
  const d = new Date();
  const days = 7 - d.getDay();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return end.toISOString().slice(0, 10);
};

const PAST_LIMIT = 80;

export function TransactionsList({ scope, companyId }: Props) {
  const { transactions, accounts, cards, categories, people, companies, deleteTransaction, updateTransaction } = useFinance();
  const { monthStart, monthEnd, isCurrentMonth } = useFinancePeriod();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('todo_mes');
  const [editing, setEditing] = useState<FinTransaction | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  const today = todayYMD();
  const weekEnd = endOfWeekYMD();


  // Lookup maps O(1) — evita find() por linha (era O(n*m) em listas grandes)
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const personMap = useMemo(() => new Map(people.map(p => [p.id, p])), [people]);
  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);

  // Scope-filtered base
  const baseScoped = useMemo(() => transactions
    .filter(t => t.scope === scope)
    .filter(t => scope !== 'pj' || companyId === 'all' || t.companyId === companyId),
  [transactions, scope, companyId]);

  // Pending of this month (for the badge)
  const pendingMonthSum = useMemo(() => baseScoped
    .filter(t => t.status === 'pending' && t.occurredOn <= monthEnd && !TRANSFER_KINDS.has(t.kind))
    .reduce((s, t) => s + (INCOMING_KINDS.has(t.kind) ? -t.amount : t.amount), 0),
  [baseScoped, monthEnd]);

  // Apply period + quick filter + search
  const visible = useMemo(() => {
    return baseScoped
      .filter(t => {
        const inMonth = t.occurredOn >= monthStart && t.occurredOn <= monthEnd;
        // Vencidas: no mês corrente, pendentes de saída de meses anteriores continuam aparecendo
        const isOverdueCarry =
          isCurrentMonth && t.status === 'pending' && t.occurredOn < monthStart
          && !INCOMING_KINDS.has(t.kind) && !TRANSFER_KINDS.has(t.kind);
        return inMonth || isOverdueCarry;
      })
      .filter(t => {
        if (filter === 'pagas') return t.status === 'confirmed';
        if (filter === 'todo_mes') return t.status === 'pending';
        return true; // tudo
      })
      .filter(t => !search.trim() || t.description.toLowerCase().includes(search.toLowerCase()));
  }, [baseScoped, filter, monthStart, monthEnd, isCurrentMonth, search]);


  // Group by bucket: atrasadas / esta semana / este mês / próximas / passadas
  const groups = useMemo(() => {
    const atrasadas: FinTransaction[] = [];
    const semana: FinTransaction[] = [];
    const mes: FinTransaction[] = [];
    const proximas: FinTransaction[] = [];
    const passadas: FinTransaction[] = [];

    visible.forEach(t => {
      // Skip duplicate "entrada" side of transfers
      if (TRANSFER_KINDS.has(t.kind) && t.amount < 0) return;

      if (t.status === 'pending' && t.occurredOn < today) {
        atrasadas.push(t);
      } else if (t.status === 'pending' && t.occurredOn <= weekEnd) {
        semana.push(t);
      } else if (t.status === 'pending' && t.occurredOn <= monthEnd) {
        mes.push(t);
      } else if (t.status === 'pending') {
        proximas.push(t);
      } else {
        passadas.push(t);
      }
    });

    // Sort each group by date (ascending for pending = soonest first; descending for passadas)
    atrasadas.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    semana.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    mes.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    proximas.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    passadas.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

    return { atrasadas, semana, mes, proximas, passadas };
  }, [visible, today, weekEnd, monthEnd]);

  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handlePay = (t: FinTransaction) => {
    updateTransaction(t.id, { status: 'confirmed' });
    const verb = INCOMING_KINDS.has(t.kind) ? 'Recebido' : 'Pago';
    toast.success(`${verb} em ${new Date().toLocaleDateString('pt-BR')}`);
  };

  const totalCount = groups.atrasadas.length + groups.semana.length + groups.mes.length + groups.proximas.length + groups.passadas.length;

  const renderGroup = (label: string, list: FinTransaction[], tone?: 'danger' | 'warning' | 'muted') => {
    if (list.length === 0) return null;
    const sum = list.reduce((s, t) => {
      if (TRANSFER_KINDS.has(t.kind)) return s;
      return s + (INCOMING_KINDS.has(t.kind) ? -t.amount : t.amount);
    }, 0);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className={cn(
            'text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5',
            tone === 'danger' && 'text-destructive',
            tone === 'warning' && 'text-amber-600 dark:text-amber-400',
            tone === 'muted' && 'text-muted-foreground',
            !tone && 'text-foreground',
          )}>
            {tone === 'danger' && <AlertCircle className="h-3 w-3" />}
            {label}
            <span className="text-[10px] opacity-60 font-medium">({list.length})</span>
          </div>
          {sum !== 0 && (
            <span className={cn(
              'text-[11px] font-semibold',
              sum > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
            )}>
              {sum > 0 ? '−' : '+'}{formatBRL(Math.abs(sum)).replace('R$', '').trim()}
            </span>
          )}
        </div>
        {list.map(t => renderRow(t, tone === 'danger'))}
      </div>
    );
  };

  const renderRow = (t: FinTransaction, isOverdue = false) => {
    const incoming = INCOMING_KINDS.has(t.kind);
    const transfer = TRANSFER_KINDS.has(t.kind);
    const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const acc = t.accountId ? accountMap.get(t.accountId) : null;
    const card = t.cardId ? cardMap.get(t.cardId) : null;
    const person = t.personId ? personMap.get(t.personId) : null;
    const company = t.companyId ? companyMap.get(t.companyId) : null;
    const Icon = transfer ? ArrowLeftRight : incoming ? ArrowDown : ArrowUp;
    const color = transfer ? '#64748b' : incoming ? '#10b981' : '#ef4444';
    const sign = transfer ? '' : incoming ? '+' : '−';
    const isRecurring = !!t.recurrenceId;
    const isPending = t.status === 'pending';

    return (
      <div
        key={t.id}
        onClick={() => setEditing(t)}
        className={cn(
          'rounded-xl border bg-card p-2.5 cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors',
          isOverdue && 'border-destructive/40 bg-destructive/5',
          !isOverdue && 'border-border',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {transfer ? t.description.replace(/\s*\(saída\)\s*$/, '') : t.description}
              </span>
              {isRecurring && <Repeat className="h-3 w-3 text-primary shrink-0" />}
            </div>
            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <span>{fmtDate(t.occurredOn)}</span>
              {[
                cat?.name,
                card?.name || acc?.name,
                person?.name,
                company?.name && scope === 'pj' && companyId === 'all' ? company.name : null,
              ].filter(Boolean).map((s, i) => (
                <span key={i}>· {s}</span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className="text-sm font-bold"
              style={{
                color: transfer
                  ? 'hsl(var(--muted-foreground))'
                  : incoming
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--destructive))',
              }}
            >
              {sign}{formatBRL(t.amount).replace('R$', '').trim()}
            </div>
          </div>
        </div>

        {/* Actions row — clearly visible */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/60">
          {isPending && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePay(t); }}
              className={cn(
                'flex-1 h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                incoming
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white',
              )}
              title={incoming ? 'Marcar como recebido' : 'Marcar como pago'}
            >
              <Check className="h-3.5 w-3.5" />
              {incoming ? 'Recebi' : 'Paguei'}
            </button>
          )}
          {!isPending && (
            <span className="flex-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> {incoming ? 'Recebido' : 'Pago'}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(t); }}
            className="h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  {transfer ? 'Os dois lados da transferência serão removidos.' : 'Esta ação não pode ser desfeita.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { deleteTransaction(t.id); toast.success('Excluído'); }}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar lançamento"
          className="rounded-xl h-9 text-sm pl-8"
        />
      </div>

      {/* Period selector */}
      <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
        {(Object.keys(periodLabels) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'shrink-0 h-8 px-3 rounded-full border text-[11px] font-semibold transition-colors',
              period === p
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:text-foreground',
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Quick filter chips */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setFilter('todo_mes')}
          className={cn(
            'flex-1 h-10 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-0 transition-colors',
            filter === 'todo_mes'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          <span>A pagar este mês</span>
          {pendingMonthSum !== 0 && (
            <span className={cn(
              'text-[10px] font-bold opacity-90',
              filter === 'todo_mes' ? '' : pendingMonthSum > 0 ? 'text-destructive' : 'text-emerald-600',
            )}>
              {pendingMonthSum > 0 ? '−' : '+'}{formatBRL(Math.abs(pendingMonthSum)).replace('R$', '').trim()}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('pagas')}
          className={cn(
            'flex-1 h-10 rounded-xl border text-xs font-semibold transition-colors',
            filter === 'pagas'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          Pagas / recebidas
        </button>
        <button
          onClick={() => setFilter('tudo')}
          className={cn(
            'flex-1 h-10 rounded-xl border text-xs font-semibold transition-colors',
            filter === 'tudo'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          Tudo
        </button>
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center space-y-2">
          <p className="text-sm text-foreground font-semibold">
            {filter === 'todo_mes' && 'Nada a pagar este mês 🎉'}
            {filter === 'pagas' && 'Ainda não há lançamentos pagos.'}
            {filter === 'tudo' && 'Nenhuma movimentação ainda.'}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Toque em <b>+ Novo lançamento</b> e marque <b>🔁 Se repete todo mês</b> se for um pagamento fixo (aluguel, salário, plano).
          </p>
        </div>
      )}

      {/* Groups */}
      {renderGroup('Atrasadas', groups.atrasadas, 'danger')}
      {renderGroup('Esta semana', groups.semana, 'warning')}
      {renderGroup('Ainda este mês', groups.mes)}
      {renderGroup('Próximas', groups.proximas, 'muted')}
      {renderGroup(
        filter === 'pagas' ? 'Histórico' : 'Já pagas / recebidas',
        showAllPast ? groups.passadas : groups.passadas.slice(0, PAST_LIMIT),
        'muted',
      )}
      {!showAllPast && groups.passadas.length > PAST_LIMIT && (
        <button
          onClick={() => setShowAllPast(true)}
          className="w-full h-9 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver mais {groups.passadas.length - PAST_LIMIT} lançamentos
        </button>
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
