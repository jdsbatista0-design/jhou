import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FinScope, FinTransaction, RecurrenceFreq, TX_KIND_LABELS, TxKind } from '@/types/finance';
import { maskBRLInput, parseBRLInput, numberToBRLInput } from '@/lib/currency';
import { Repeat, Pause, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  scope: FinScope;
  companyId: string | null;
  /** When provided the dialog edits the given transaction instead of creating one */
  editTransaction?: FinTransaction | null;
}

export function TransactionDialog({ open, onClose, scope, companyId, editTransaction }: Props) {
  const {
    accounts, cards, categories, people, companies, recurrences,
    addTransaction, updateTransaction, deleteTransaction, deleteTransactionAndFuture,
    addRecurrence, updateRecurrence, deleteRecurrence,
    addTransferBetweenAccounts, addInterCompanyTransfer,
  } = useFinance();

  const isEdit = !!editTransaction;
  const editRecurrence = editTransaction?.recurrenceId
    ? recurrences.find(r => r.id === editTransaction.recurrenceId)
    : null;
  const isTransferEdit = isEdit && !!editTransaction?.transferId;

  const [kind, setKind] = useState<TxKind>('expense');
  const [amount, setAmount] = useState(''); // masked BRL string
  const [description, setDescription] = useState('');
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<string>('none');
  const [cardId, setCardId] = useState<string>('none');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [personId, setPersonId] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'confirmed' | 'pending'>('confirmed');
  // Recurrence (create mode only — editing rules happens via a sub-dialog)
  const [repeats, setRepeats] = useState(false);
  const [repFrequency, setRepFrequency] = useState<RecurrenceFreq>('monthly');
  const [repHasEnd, setRepHasEnd] = useState(false);
  const [repEndOn, setRepEndOn] = useState('');
  const [confirmDeleteFuture, setConfirmDeleteFuture] = useState(false);
  // Transfer-specific (only for create)
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [toCompanyId, setToCompanyId] = useState<string>('');
  const [toCompanyAccountId, setToCompanyAccountId] = useState<string>('');

  const isTransfer = kind === 'transfer';
  const isInter = kind === 'inter_company';

  // Hydrate state when editing
  useEffect(() => {
    if (!open) return;
    if (editTransaction) {
      setKind(editTransaction.kind);
      // For transfer rows we stored signed amount (out=positive, in=negative). Always edit absolute value.
      setAmount(numberToBRLInput(Math.abs(editTransaction.amount)));
      // Strip "(saída)/(entrada)" suffix from transfer descriptions
      setDescription(editTransaction.description.replace(/\s*\((saída|entrada)\)\s*$/i, ''));
      setOccurredOn(editTransaction.occurredOn);
      setAccountId(editTransaction.accountId || 'none');
      setCardId(editTransaction.cardId || 'none');
      setCategoryId(editTransaction.categoryId || 'none');
      setPersonId(editTransaction.personId || 'none');
      setNotes(editTransaction.notes || '');
      setStatus(editTransaction.status === 'pending' ? 'pending' : 'confirmed');
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editTransaction?.id]);

  const availableAccounts = useMemo(() => accounts.filter(a => !a.archived && a.scope === scope &&
    (scope === 'pf' || (companyId && companyId !== 'all' ? a.companyId === companyId : true))), [accounts, scope, companyId]);

  const availableCards = useMemo(() => cards.filter(c => !c.archived && c.scope === scope &&
    (scope === 'pf' || (companyId && companyId !== 'all' ? c.companyId === companyId : true))), [cards, scope, companyId]);

  const availableCategories = useMemo(() => categories.filter(c => !c.archived && c.scope === scope), [categories, scope]);

  const availablePeople = useMemo(() => people.filter(p => !p.archived &&
    (companyId && companyId !== 'all' ? p.companyId === companyId : true)), [people, companyId]);

  const otherCompanies = companies.filter(c => !c.archived && c.id !== companyId);
  const accountsOfTargetCompany = accounts.filter(a => !a.archived && a.scope === 'pj' && a.companyId === toCompanyId);

  const reset = () => {
    setKind('expense'); setAmount(''); setDescription(''); setOccurredOn(new Date().toISOString().slice(0, 10));
    setAccountId('none'); setCardId('none'); setCategoryId('none'); setPersonId('none'); setNotes('');
    setStatus('confirmed'); setFromAccountId(''); setToAccountId(''); setToCompanyId(''); setToCompanyAccountId('');
    setRepeats(false); setRepFrequency('monthly'); setRepHasEnd(false); setRepEndOn('');
  };

  const handleSave = async () => {
    const amt = parseBRLInput(amount);
    if (!amt || amt <= 0) { toast.error('Valor inválido'); return; }
    if (!description.trim()) { toast.error('Informe a descrição'); return; }

    if (isEdit && editTransaction) {
      // Edition path — update only safe fields. Transfer rows keep their structure.
      const signedAmount = isTransferEdit && editTransaction.amount < 0 ? -amt : amt;
      await updateTransaction(editTransaction.id, {
        amount: signedAmount,
        description: isTransferEdit
          ? `${description.trim()} (${editTransaction.amount < 0 ? 'entrada' : 'saída'})`
          : description.trim(),
        occurredOn,
        status,
        categoryId: categoryId !== 'none' ? categoryId : undefined,
        personId: personId !== 'none' ? personId : undefined,
        accountId: accountId !== 'none' ? accountId : undefined,
        cardId: cardId !== 'none' ? cardId : undefined,
        notes: notes.trim() || undefined,
        kind,
      });
      toast.success('Lançamento atualizado');
      reset(); onClose(); return;
    }

    if (isTransfer) {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        toast.error('Selecione contas diferentes para a transferência'); return;
      }
      await addTransferBetweenAccounts({
        scope, companyId: scope === 'pj' ? (companyId || undefined) : undefined,
        fromAccountId, toAccountId, amount: amt, description: description.trim(), occurredOn,
      });
      toast.success('Transferência registrada');
      reset(); onClose(); return;
    }

    if (isInter) {
      if (!fromAccountId || !toCompanyId || !toCompanyAccountId) {
        toast.error('Preencha origem e destino'); return;
      }
      if (!companyId || companyId === 'all') { toast.error('Selecione a empresa de origem'); return; }
      await addInterCompanyTransfer({
        fromCompanyId: companyId, fromAccountId,
        toCompanyId, toAccountId: toCompanyAccountId,
        amount: amt, description: description.trim(), occurredOn,
      });
      toast.success('Transferência entre empresas registrada');
      reset(); onClose(); return;
    }

    // Recurrence: only allowed for plain income/expense (no transfers, no inter)
    const canRepeat = !isTransfer && !isInter && (kind === 'income' || kind === 'expense');
    let recurrenceId: string | undefined;
    if (canRepeat && repeats) {
      const dayOfMonth = parseInt(occurredOn.slice(-2), 10);
      const newRecId = await addRecurrence({
        scope,
        companyId: scope === 'pj' ? (companyId || undefined) : undefined,
        accountId: accountId !== 'none' ? accountId : undefined,
        cardId: cardId !== 'none' ? cardId : undefined,
        categoryId: categoryId !== 'none' ? categoryId : undefined,
        description: description.trim(),
        amount: amt,
        kind: kind as 'income' | 'expense',
        frequency: repFrequency,
        dayOfMonth: repFrequency === 'monthly' ? dayOfMonth : undefined,
        startOn: occurredOn,
        endOn: repHasEnd && repEndOn ? repEndOn : undefined,
      });
      recurrenceId = newRecId || undefined;
    }

    await addTransaction({
      scope, companyId: scope === 'pj' ? (companyId || undefined) : undefined,
      accountId: accountId !== 'none' ? accountId : undefined,
      cardId: cardId !== 'none' ? cardId : undefined,
      categoryId: categoryId !== 'none' ? categoryId : undefined,
      personId: personId !== 'none' ? personId : undefined,
      recurrenceId,
      kind, amount: amt, description: description.trim(), occurredOn, status,
      notes: notes.trim() || undefined,
      source: recurrenceId ? 'recurrence' : 'manual',
    });

    if (recurrenceId) {
      // Mark this first occurrence as already generated so the auto-generator
      // doesn't try to recreate it next time.
      await updateRecurrence(recurrenceId, { lastGeneratedOn: occurredOn });
      toast.success('Lançamento e recorrência criados');
    } else {
      toast.success('Lançamento registrado');
    }
    reset(); onClose();
  };

  const handlePauseRecurrence = async () => {
    if (!editRecurrence) return;
    await updateRecurrence(editRecurrence.id, { active: !editRecurrence.active });
    toast.success(editRecurrence.active ? 'Recorrência pausada' : 'Recorrência reativada');
  };

  const handleEndRecurrence = async () => {
    if (!editRecurrence) return;
    const today = new Date().toISOString().slice(0, 10);
    await updateRecurrence(editRecurrence.id, { endOn: today, active: false });
    toast.success('Recorrência encerrada');
  };

  const handleDeleteOnlyThis = async () => {
    if (!editTransaction) return;
    await deleteTransaction(editTransaction.id);
    toast.success('Lançamento excluído');
    reset(); onClose();
  };

  const handleDeleteThisAndFuture = async () => {
    if (!editTransaction) return;
    await deleteTransactionAndFuture(editTransaction.id);
    if (editRecurrence) {
      await updateRecurrence(editRecurrence.id, { active: false });
    }
    toast.success('Esta e as futuras foram excluídas');
    setConfirmDeleteFuture(false);
    reset(); onClose();
  };

  // Allowed kinds depend on scope
  const allowedKinds: TxKind[] = scope === 'pf'
    ? ['expense', 'income', 'transfer', 'card_payment']
    : ['expense', 'income', 'transfer', 'card_payment', 'employee_payment', 'supplier_payment',
       'employee_loan', 'bank_loan', 'tax', 'receivable', 'inter_company'];

  // In edit mode, disable kind change for transfer rows (would need to rebuild both sides)
  const kindDisabled = isEdit && isTransferEdit;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
        </DialogHeader>

        {isEdit && editRecurrence && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs space-y-2">
            <div className="flex items-start gap-2 text-foreground">
              <Repeat className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <div className="leading-snug">
                <div className="font-semibold">
                  Este lançamento se repete{' '}
                  {editRecurrence.frequency === 'monthly' ? 'todo mês' :
                   editRecurrence.frequency === 'weekly' ? 'toda semana' : 'todo ano'}
                  {editRecurrence.active ? '' : ' (pausado)'}.
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Editar aqui altera só esta ocorrência. Use os botões abaixo se quiser mudar a regra inteira.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={handlePauseRecurrence} className="h-7 rounded-lg text-[11px]">
                {editRecurrence.active ? <><Pause className="h-3 w-3 mr-1" /> Pausar repetição</> : <><Play className="h-3 w-3 mr-1" /> Reativar repetição</>}
              </Button>
              {editRecurrence.active && (
                <Button size="sm" variant="outline" onClick={handleEndRecurrence} className="h-7 rounded-lg text-[11px]">
                  Parar de repetir
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setConfirmDeleteFuture(true)} className="h-7 rounded-lg text-[11px] text-destructive ml-auto">
                <Trash2 className="h-3 w-3 mr-1" /> Excluir esta e futuras
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={kind} onValueChange={v => setKind(v as TxKind)} disabled={kindDisabled}>
              <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedKinds.map(k => <SelectItem key={k} value={k}>{TX_KIND_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Valor</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                <Input
                  value={amount}
                  onChange={e => setAmount(maskBRLInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="0,00"
                  className="rounded-xl h-9 text-sm pl-9 text-right font-medium"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={occurredOn} onChange={e => setOccurredOn(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: mercado, aluguel, salário João" className="rounded-xl h-9 text-sm" />
          </div>

          {!isEdit && isTransfer && (
            <>
              <div>
                <Label className="text-xs">De (conta)</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Conta de origem" /></SelectTrigger>
                  <SelectContent>{availableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Para (conta)</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Conta de destino" /></SelectTrigger>
                  <SelectContent>{availableAccounts.filter(a => a.id !== fromAccountId).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}

          {!isEdit && isInter && (
            <>
              <div>
                <Label className="text-xs">De (conta da empresa atual)</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Conta de origem" /></SelectTrigger>
                  <SelectContent>{availableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Empresa destino</Label>
                <Select value={toCompanyId} onValueChange={(v) => { setToCompanyId(v); setToCompanyAccountId(''); }}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Empresa destino" /></SelectTrigger>
                  <SelectContent>{otherCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {toCompanyId && (
                <div>
                  <Label className="text-xs">Conta destino</Label>
                  <Select value={toCompanyAccountId} onValueChange={setToCompanyAccountId}>
                    <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Conta destino" /></SelectTrigger>
                    <SelectContent>{accountsOfTargetCompany.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {(isEdit || (!isTransfer && !isInter)) && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Conta</Label>
                  <Select value={accountId} onValueChange={(v) => { setAccountId(v); if (v !== 'none') setCardId('none'); }}>
                    <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {availableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Cartão</Label>
                  <Select value={cardId} onValueChange={(v) => { setCardId(v); if (v !== 'none') setAccountId('none'); }}>
                    <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {availableCards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {availableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {scope === 'pj' && availablePeople.length > 0 && (
                <div>
                  <Label className="text-xs">Pessoa (funcionário/fornecedor)</Label>
                  <Select value={personId} onValueChange={setPersonId}>
                    <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {availablePeople.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as 'confirmed' | 'pending')}>
                  <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmado (já pagou/recebeu)</SelectItem>
                    <SelectItem value="pending">Previsto (a pagar/receber)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Observação</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" className="rounded-xl text-sm min-h-[60px]" />
              </div>

              {/* Recurrence block — only when creating a plain income/expense */}
              {!isEdit && (kind === 'income' || kind === 'expense') && (
                <div className={cn(
                  'rounded-xl border p-3 space-y-2 transition-colors',
                  repeats
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/30',
                )}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rep-toggle" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
                      <Repeat className={cn('h-4 w-4', repeats ? 'text-primary' : 'text-muted-foreground')} />
                      <span>Se repete todo mês</span>
                    </Label>
                    <Switch id="rep-toggle" checked={repeats} onCheckedChange={setRepeats} />
                  </div>
                  {!repeats && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Marque para que este pagamento apareça automaticamente todo mês como <b>previsto</b>.
                    </p>
                  )}
                  {repeats && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Frequência</Label>
                          <Select value={repFrequency} onValueChange={v => setRepFrequency(v as RecurrenceFreq)}>
                            <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Termina em</Label>
                          <Select
                            value={repHasEnd ? 'date' : 'never'}
                            onValueChange={v => { setRepHasEnd(v === 'date'); if (v !== 'date') setRepEndOn(''); }}
                          >
                            <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="never">Sem fim</SelectItem>
                              <SelectItem value="date">Escolher data</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {repHasEnd && (
                        <Input
                          type="date" value={repEndOn} onChange={e => setRepEndOn(e.target.value)}
                          min={occurredOn}
                          className="rounded-xl h-8 text-xs"
                        />
                      )}
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        ✓ Próximas ocorrências serão criadas como <b>Previsto</b>{' '}
                        {repFrequency === 'monthly' ? `todo dia ${parseInt(occurredOn.slice(-2), 10)}` :
                         repFrequency === 'weekly' ? 'a cada 7 dias' : 'todo ano'} até {repHasEnd && repEndOn ? new Date(repEndOn + 'T00:00:00').toLocaleDateString('pt-BR') : 'você encerrar'}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit && (
            <Button
              variant="outline"
              onClick={handleDeleteOnlyThis}
              className="rounded-xl text-destructive hover:text-destructive mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => { reset(); onClose(); }} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleSave} className="rounded-xl">{isEdit ? 'Salvar alterações' : 'Salvar'}</Button>
        </DialogFooter>

        <AlertDialog open={confirmDeleteFuture} onOpenChange={setConfirmDeleteFuture}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir esta e as futuras ocorrências?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as ocorrências da recorrência <b>{editRecurrence?.description}</b> a partir de{' '}
                <b>{editTransaction && new Date(editTransaction.occurredOn + 'T00:00:00').toLocaleDateString('pt-BR')}</b>{' '}
                serão removidas e a regra será pausada. Ocorrências anteriores não são afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteThisAndFuture} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir todas a partir desta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
