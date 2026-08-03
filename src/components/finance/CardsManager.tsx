import { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FinScope, FinCard, formatBRL } from '@/types/finance';
import { maskBRLInput, parseBRLInput, numberToBRLInput } from '@/lib/currency';

interface Props {
  scope: FinScope;
  companyId: string | null;
  onOpenCard: (cardId: string) => void;
}

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; card: FinCard };

export function CardForm({ mode, scope, companyId, availableAccounts, onDone }: {
  mode: FormMode; scope: FinScope; companyId: string | null;
  availableAccounts: ReturnType<typeof useFinance>['accounts'];
  onDone: () => void;
}) {
  const { addCard, updateCard } = useFinance();
  const editing = mode.kind === 'edit' ? mode.card : null;
  const [name, setName] = useState(editing?.name || '');
  const [brand, setBrand] = useState(editing?.brand || '');
  const [limitAmount, setLimit] = useState(editing ? numberToBRLInput(editing.limitAmount || 0) : '');
  const [closingDay, setClosing] = useState(editing?.closingDay ? String(editing.closingDay) : '');
  const [dueDay, setDue] = useState(editing?.dueDay ? String(editing.dueDay) : '');
  const [accountId, setAccountId] = useState<string>(editing?.accountId || 'none');

  useEffect(() => {
    if (editing) {
      setName(editing.name || '');
      setBrand(editing.brand || '');
      setLimit(numberToBRLInput(editing.limitAmount || 0));
      setClosing(editing.closingDay ? String(editing.closingDay) : '');
      setDue(editing.dueDay ? String(editing.dueDay) : '');
      setAccountId(editing.accountId || 'none');
    }
  }, [editing?.id]);

  const submit = async () => {
    if (!name.trim()) { toast.error('Informe o nome do cartão'); return; }
    const patch: Partial<FinCard> = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      limitAmount: parseBRLInput(limitAmount),
      closingDay: parseInt(closingDay) || undefined,
      dueDay: parseInt(dueDay) || undefined,
      accountId: accountId !== 'none' ? accountId : undefined,
    };
    if (editing) {
      await updateCard(editing.id, patch);
      toast.success('Cartão atualizado');
    } else {
      if (scope === 'pj' && (!companyId || companyId === 'all')) {
        toast.error('Selecione uma empresa específica'); return;
      }
      await addCard({
        scope, companyId: scope === 'pj' ? companyId! : undefined,
        color: '#a855f7', ...patch,
      } as any);
      toast.success('Cartão cadastrado');
    }
    onDone();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {editing ? 'Editar cartão' : 'Novo cartão'}
        </h3>
        <button onClick={onDone} className="text-[11px] text-muted-foreground">Cancelar</button>
      </div>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex.: Nubank Roxinho)" className="rounded-xl h-10 text-sm" />
      <div className="flex gap-2">
        <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Bandeira" className="rounded-xl h-10 text-sm flex-1" />
        <Input value={limitAmount} onChange={e => setLimit(maskBRLInput(e.target.value))} placeholder="Limite R$ 0,00" inputMode="numeric" className="rounded-xl h-10 text-sm flex-1 text-right font-mono" />
      </div>
      <div className="flex gap-2">
        <Input value={closingDay} onChange={e => setClosing(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Dia de fechamento" inputMode="numeric" className="rounded-xl h-10 text-sm flex-1" />
        <Input value={dueDay} onChange={e => setDue(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Dia de vencimento" inputMode="numeric" className="rounded-xl h-10 text-sm flex-1" />
      </div>
      {availableAccounts.length > 0 && (
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="rounded-xl h-10 text-sm"><SelectValue placeholder="Conta que paga a fatura (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem conta vinculada</SelectItem>
            {availableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button onClick={submit} size="sm" className="w-full rounded-xl h-10">
        <Plus className="h-3.5 w-3.5 mr-1" /> {editing ? 'Salvar alterações' : 'Cadastrar cartão'}
      </Button>
    </div>
  );
}

/** Lista enxuta de cartões: um toque abre a fatura completa. */
export function CardsManager({ scope, companyId, onOpenCard }: Props) {
  const { cards, accounts, getCardStatement } = useFinance();
  const [creating, setCreating] = useState(false);

  const monthISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const visible = useMemo(() => cards.filter(c => {
    if (c.archived || c.scope !== scope) return false;
    if (scope === 'pj') return companyId === 'all' ? true : c.companyId === companyId;
    return true;
  }), [cards, scope, companyId]);

  const availableAccounts = accounts.filter(a => !a.archived && a.scope === scope &&
    (scope === 'pf' || a.companyId === companyId));

  const canAdd = scope === 'pf' || (scope === 'pj' && companyId && companyId !== 'all');

  const rows = useMemo(() => visible.map(c => {
    const st = getCardStatement(c.id, monthISO);
    const used = c.limitAmount > 0 ? Math.min(100, (st.remaining / c.limitAmount) * 100) : 0;
    const days = st.due
      ? Math.round((new Date(st.due + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
      : null;
    return { card: c, st, used, days };
  }), [visible, getCardStatement, monthISO]);

  return (
    <div className="space-y-2">
      {creating && (
        <CardForm
          mode={{ kind: 'create' }}
          scope={scope}
          companyId={companyId}
          availableAccounts={availableAccounts}
          onDone={() => setCreating(false)}
        />
      )}

      {rows.length === 0 && !creating && (
        <p className="text-xs text-muted-foreground text-center py-6">
          {canAdd ? 'Nenhum cartão cadastrado ainda.' : 'Selecione uma empresa para cadastrar cartões.'}
        </p>
      )}

      {rows.map(({ card: c, st, used, days }) => {
        const statusLabel = st.remaining <= 0 && st.total > 0 ? 'Paga'
          : days === null ? 'Sem vencimento'
          : days < 0 ? `Atrasada ${Math.abs(days)}d`
          : days === 0 ? 'Vence hoje'
          : `Vence em ${days}d`;
        const statusTone = st.remaining <= 0 && st.total > 0 ? 'text-emerald-500'
          : days !== null && days < 0 ? 'text-destructive'
          : days !== null && days <= 3 ? 'text-amber-500' : 'text-muted-foreground';
        return (
          <button
            key={c.id}
            onClick={() => onOpenCard(c.id)}
            className="w-full text-left rounded-2xl border border-border bg-card p-3 space-y-2 active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold"
                   style={{ background: c.color + '22', color: c.color }}>
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                <div className={`text-[11px] truncate ${statusTone}`}>{statusLabel}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-foreground">{formatBRL(st.remaining)}</div>
                <div className="text-[10px] text-muted-foreground">de {formatBRL(c.limitAmount || 0)}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${used}%`, background: used > 80 ? 'hsl(var(--destructive))' : c.color }} />
            </div>
          </button>
        );
      })}

      {canAdd && !creating && (
        <Button onClick={() => setCreating(true)} variant="outline" size="sm" className="w-full rounded-xl h-10 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo cartão
        </Button>
      )}
    </div>
  );
}
