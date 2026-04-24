import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { FinScope, FinTransaction, TX_KIND_LABELS, formatBRL } from '@/types/finance';
import { Trash2, ArrowDown, ArrowUp, ArrowLeftRight, Check, Clock, Search, Repeat, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionDialog } from './TransactionDialog';

interface Props { scope: FinScope; companyId: string | null; }

const INCOMING_KINDS = new Set(['income', 'receivable', 'bank_loan']);
const TRANSFER_KINDS = new Set(['transfer', 'inter_company']);

export function TransactionsList({ scope, companyId }: Props) {
  const { transactions, accounts, cards, categories, people, companies, deleteTransaction, updateTransaction } = useFinance();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [filterKind, setFilterKind] = useState<'all' | 'incoming' | 'outgoing' | 'transfer'>('all');

  const visible = useMemo(() => {
    return transactions
      .filter(t => t.scope === scope)
      .filter(t => scope !== 'pj' || companyId === 'all' || t.companyId === companyId)
      .filter(t => filterStatus === 'all' || t.status === filterStatus)
      .filter(t => {
        if (filterKind === 'all') return true;
        if (filterKind === 'incoming') return INCOMING_KINDS.has(t.kind);
        if (filterKind === 'outgoing') return !INCOMING_KINDS.has(t.kind) && !TRANSFER_KINDS.has(t.kind);
        if (filterKind === 'transfer') return TRANSFER_KINDS.has(t.kind);
        return true;
      })
      .filter(t => !search.trim() || t.description.toLowerCase().includes(search.toLowerCase()));
  }, [transactions, scope, companyId, search, filterStatus, filterKind]);

  // Group by date
  const grouped = useMemo(() => {
    const byDate: Record<string, typeof visible> = {};
    visible.forEach(t => {
      if (!byDate[t.occurredOn]) byDate[t.occurredOn] = [];
      byDate[t.occurredOn].push(t);
    });
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [visible]);

  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lançamento" className="rounded-xl h-9 text-sm pl-8" />
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="rounded-xl h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="pending">Previstos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterKind} onValueChange={v => setFilterKind(v as any)}>
          <SelectTrigger className="rounded-xl h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="incoming">Entradas</SelectItem>
            <SelectItem value="outgoing">Saídas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum lançamento encontrado.</p>
      )}

      {grouped.map(([date, list]) => {
        // Show only "saída" rows of transfers (positive amount), not the duplicate "entrada"
        const filtered = list.filter(t => !TRANSFER_KINDS.has(t.kind) || t.amount >= 0);
        if (filtered.length === 0) return null;
        return (
          <div key={date} className="space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{fmtDate(date)}</div>
            {filtered.map(t => {
              const incoming = INCOMING_KINDS.has(t.kind);
              const transfer = TRANSFER_KINDS.has(t.kind);
              const cat = t.categoryId ? categories.find(c => c.id === t.categoryId) : null;
              const acc = t.accountId ? accounts.find(a => a.id === t.accountId) : null;
              const card = t.cardId ? cards.find(c => c.id === t.cardId) : null;
              const person = t.personId ? people.find(p => p.id === t.personId) : null;
              const company = t.companyId ? companies.find(c => c.id === t.companyId) : null;
              const Icon = transfer ? ArrowLeftRight : incoming ? ArrowDown : ArrowUp;
              const color = transfer ? '#64748b' : incoming ? '#10b981' : '#ef4444';
              const sign = transfer ? '' : incoming ? '+' : '−';
              return (
                <div key={t.id} className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate flex-1">
                        {transfer ? t.description.replace(/\s*\(saída\)\s*$/, '') : t.description}
                      </span>
                      {t.status === 'pending' && <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {[
                        cat?.name,
                        card?.name || acc?.name,
                        person?.name,
                        company?.name && scope === 'pj' && companyId === 'all' ? company.name : null,
                        TX_KIND_LABELS[t.kind],
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: incoming ? 'hsl(var(--foreground))' : transfer ? 'hsl(var(--muted-foreground))' : 'hsl(var(--destructive))' }}>
                      {sign}{formatBRL(t.amount).replace('R$', '').trim()}
                    </div>
                  </div>
                  {t.status === 'pending' && (
                    <button
                      onClick={() => { updateTransaction(t.id, { status: 'confirmed' }); toast.success('Confirmado'); }}
                      className="p-1.5 text-muted-foreground hover:text-emerald-500"
                      title="Confirmar pagamento"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
