import { useState, useMemo } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ACCOUNT_TYPE_LABELS, AccountType, FinScope, formatBRL } from '@/types/finance';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props { scope: FinScope; companyId: string | null; }

export function AccountsManager({ scope, companyId }: Props) {
  const { accounts, addAccount, deleteAccount, accountBalance, companies } = useFinance();
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState<AccountType>('corrente');
  const [initial, setInitial] = useState('');

  const visible = useMemo(() => accounts.filter(a => {
    if (a.archived) return false;
    if (a.scope !== scope) return false;
    if (scope === 'pj') {
      if (companyId === 'all') return true;
      return a.companyId === companyId;
    }
    return true;
  }), [accounts, scope, companyId]);

  const canAdd = scope === 'pf' || (scope === 'pj' && companyId && companyId !== 'all');

  const handleAdd = async () => {
    if (!name.trim()) { toast.error('Informe o nome da conta'); return; }
    if (scope === 'pj' && (!companyId || companyId === 'all')) {
      toast.error('Selecione uma empresa específica'); return;
    }
    await addAccount({
      scope, companyId: scope === 'pj' ? companyId! : undefined,
      name: name.trim(), bank: bank.trim() || undefined, type,
      initialBalance: parseFloat(initial.replace(',', '.')) || 0,
      color: '#0ea5e9',
    });
    setName(''); setBank(''); setInitial(''); setType('corrente');
    toast.success('Conta cadastrada');
  };

  const totalBalance = visible.reduce((s, a) => s + accountBalance(a.id), 0);

  return (
    <div className="space-y-3">
      {visible.length > 0 && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Saldo total</span>
          <span className="text-base font-bold text-foreground">{formatBRL(totalBalance)}</span>
        </div>
      )}

      {canAdd && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova conta</h3>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex.: Itaú principal)" className="rounded-xl h-9 text-sm" />
          <Input value={bank} onChange={e => setBank(e.target.value)} placeholder="Banco (opcional)" className="rounded-xl h-9 text-sm" />
          <div className="flex gap-2">
            <Select value={type} onValueChange={v => setType(v as AccountType)}>
              <SelectTrigger className="rounded-xl h-9 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={initial} onChange={e => setInitial(e.target.value)} placeholder="Saldo inicial" inputMode="decimal" className="rounded-xl h-9 text-sm flex-1" />
          </div>
          <Button onClick={handleAdd} size="sm" className="w-full rounded-xl h-9">
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {canAdd ? 'Nenhuma conta cadastrada.' : 'Selecione uma empresa para cadastrar contas.'}
          </p>
        )}
        {visible.map(a => {
          const balance = accountBalance(a.id);
          const company = a.companyId ? companies.find(c => c.id === a.companyId) : null;
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: a.color + '22' }}>
                <Wallet className="h-4 w-4" style={{ color: a.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {ACCOUNT_TYPE_LABELS[a.type]}{a.bank ? ` · ${a.bank}` : ''}{company ? ` · ${company.name}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatBRL(balance)}</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                    <AlertDialogDescription>Os lançamentos vinculados perderão referência da conta (mas não serão apagados).</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteAccount(a.id); toast.success('Conta excluída'); }}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}
