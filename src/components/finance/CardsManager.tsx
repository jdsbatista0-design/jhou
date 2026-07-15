import { useState, useMemo, useEffect } from 'react';
import { Plus, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FinScope, FinCard, formatBRL } from '@/types/finance';
import { CardStatement } from './CardStatement';
import { maskBRLInput, parseBRLInput, numberToBRLInput } from '@/lib/currency';

interface Props { scope: FinScope; companyId: string | null; }

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
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex.: Nubank Roxinho)" className="rounded-xl h-9 text-sm" />
      <div className="flex gap-2">
        <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Bandeira" className="rounded-xl h-9 text-sm flex-1" />
        <Input value={limitAmount} onChange={e => setLimit(maskBRLInput(e.target.value))} placeholder="Limite R$ 0,00" inputMode="numeric" className="rounded-xl h-9 text-sm flex-1 text-right font-mono" />
      </div>
      <div className="flex gap-2">
        <Input value={closingDay} onChange={e => setClosing(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="Dia fechamento" inputMode="numeric" className="rounded-xl h-9 text-sm flex-1" />
        <Input value={dueDay} onChange={e => setDue(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="Dia vencimento" inputMode="numeric" className="rounded-xl h-9 text-sm flex-1" />
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
      <Button onClick={submit} size="sm" className="w-full rounded-xl h-9">
        <Plus className="h-3.5 w-3.5 mr-1" /> {editing ? 'Salvar alterações' : 'Cadastrar'}
      </Button>
    </div>
  );
}

export function CardsManager({ scope, companyId }: Props) {
  const { cards, accounts, cardOpenInvoice } = useFinance();
  const [formMode, setFormMode] = useState<FormMode>({ kind: 'closed' });
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      {formMode.kind === 'create' && (
        <CardForm
          mode={formMode}
          scope={scope}
          companyId={companyId}
          availableAccounts={availableAccounts}
          onDone={() => setFormMode({ kind: 'closed' })}
        />
      )}
      {canAdd && formMode.kind === 'closed' && (
        <Button onClick={() => setFormMode({ kind: 'create' })} variant="outline" size="sm" className="w-full rounded-xl h-9 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo cartão
        </Button>
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
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.color + '22' }}>
                  <CreditCard className="h-4 w-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.brand && `${c.brand} · `}Fecha dia {c.closingDay || '—'} · Vence dia {c.dueDay || '—'}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Fatura em aberto</span>
                  <span className="font-semibold text-foreground">{formatBRL(invoice)} / {formatBRL(c.limitAmount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${used}%`, background: used > 80 ? 'hsl(var(--destructive))' : c.color }} />
                </div>
              </div>

              {isOpen && (
                <div className="pt-2 border-t border-border/40">
                  <CardStatement
                    cardId={c.id}
                    availableAccounts={availableAccounts}
                    onEditCard={() => setFormMode({ kind: 'edit', card: c })}
                  />
                  {formMode.kind === 'edit' && formMode.card.id === c.id && (
                    <div className="pt-3">
                      <CardForm
                        mode={formMode}
                        scope={scope}
                        companyId={companyId}
                        availableAccounts={availableAccounts}
                        onDone={() => setFormMode({ kind: 'closed' })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
