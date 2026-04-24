import { useState, useMemo } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FinScope, formatBRL } from '@/types/finance';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props { scope: FinScope; companyId: string | null; }

export function CardsManager({ scope, companyId }: Props) {
  const { cards, accounts, addCard, deleteCard, cardOpenInvoice } = useFinance();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [limitAmount, setLimit] = useState('');
  const [closingDay, setClosing] = useState('');
  const [dueDay, setDue] = useState('');
  const [accountId, setAccountId] = useState<string>('none');

  const visible = useMemo(() => cards.filter(c => {
    if (c.archived) return false;
    if (c.scope !== scope) return false;
    if (scope === 'pj') {
      if (companyId === 'all') return true;
      return c.companyId === companyId;
    }
    return true;
  }), [cards, scope, companyId]);

  const availableAccounts = accounts.filter(a => !a.archived && a.scope === scope &&
    (scope === 'pf' || a.companyId === companyId));

  const canAdd = scope === 'pf' || (scope === 'pj' && companyId && companyId !== 'all');

  const handleAdd = async () => {
    if (!name.trim()) { toast.error('Informe o nome do cartão'); return; }
    if (scope === 'pj' && (!companyId || companyId === 'all')) {
      toast.error('Selecione uma empresa específica'); return;
    }
    await addCard({
      scope, companyId: scope === 'pj' ? companyId! : undefined,
      accountId: accountId !== 'none' ? accountId : undefined,
      name: name.trim(), brand: brand.trim() || undefined,
      limitAmount: parseFloat(limitAmount.replace(',', '.')) || 0,
      closingDay: parseInt(closingDay) || undefined,
      dueDay: parseInt(dueDay) || undefined,
      color: '#a855f7',
    });
    setName(''); setBrand(''); setLimit(''); setClosing(''); setDue(''); setAccountId('none');
    toast.success('Cartão cadastrado');
  };

  return (
    <div className="space-y-3">
      {canAdd && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Novo cartão</h3>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex.: Nubank Roxinho)" className="rounded-xl h-9 text-sm" />
          <div className="flex gap-2">
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Bandeira" className="rounded-xl h-9 text-sm flex-1" />
            <Input value={limitAmount} onChange={e => setLimit(e.target.value)} placeholder="Limite" inputMode="decimal" className="rounded-xl h-9 text-sm flex-1" />
          </div>
          <div className="flex gap-2">
            <Input value={closingDay} onChange={e => setClosing(e.target.value)} placeholder="Dia fechamento" inputMode="numeric" className="rounded-xl h-9 text-sm flex-1" />
            <Input value={dueDay} onChange={e => setDue(e.target.value)} placeholder="Dia vencimento" inputMode="numeric" className="rounded-xl h-9 text-sm flex-1" />
          </div>
          {availableAccounts.length > 0 && (
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Conta vinculada (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem conta vinculada</SelectItem>
                {availableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAdd} size="sm" className="w-full rounded-xl h-9">
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {canAdd ? 'Nenhum cartão cadastrado.' : 'Selecione uma empresa para cadastrar cartões.'}
          </p>
        )}
        {visible.map(c => {
          const invoice = cardOpenInvoice(c.id);
          const used = c.limitAmount > 0 ? Math.min(100, (invoice / c.limitAmount) * 100) : 0;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: c.color + '22' }}>
                  <CreditCard className="h-4 w-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.brand && `${c.brand} · `}Fechamento dia {c.closingDay || '—'} · Vence dia {c.dueDay || '—'}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                      <AlertDialogDescription>Os lançamentos no cartão perderão referência (mas continuam existindo).</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteCard(c.id); toast.success('Cartão excluído'); }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Fatura aberta</span>
                  <span className="font-semibold text-foreground">{formatBRL(invoice)} / {formatBRL(c.limitAmount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${used}%`, background: used > 80 ? 'hsl(var(--destructive))' : c.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
