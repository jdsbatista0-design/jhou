import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Wallet, AlertCircle, Layers, Plus, Info } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TransactionDialog } from './TransactionDialog';
import { maskBRLInput, parseBRLInput, numberToBRLInput } from '@/lib/currency';

interface Props { cardId: string }

function fmtMonth(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function fmtDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function CardStatement({ cardId }: Props) {
  const {
    cards, getCardStatement, getCardCategoryBreakdown, getCardActiveInstallments, categories,
    setCardStatementOverride, addTransaction,
  } = useFinance();
  const card = cards.find(c => c.id === cardId);
  const now = new Date();
  const [monthISO, setMonthISO] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [payOpen, setPayOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState('');

  const statement = useMemo(() => getCardStatement(cardId, monthISO), [getCardStatement, cardId, monthISO]);
  const breakdown = useMemo(() => getCardCategoryBreakdown(cardId, monthISO), [getCardCategoryBreakdown, cardId, monthISO]);
  const activeInst = useMemo(() => getCardActiveInstallments(cardId), [getCardActiveInstallments, cardId]);
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  if (!card) return null;

  const shiftMonth = (delta: number) => {
    const [y, m] = monthISO.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthISO(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const hasOverride = statement.override !== null;
  const diff = hasOverride ? statement.override! - statement.computed : 0;
  const hasDiff = hasOverride && Math.abs(diff) >= 0.01;

  const statusBadge = {
    open: <Badge variant="secondary" className="text-[10px]">Em aberto</Badge>,
    closed: <Badge variant="destructive" className="text-[10px]">Fechada · a pagar</Badge>,
    partial: <Badge className="text-[10px] bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">Paga em parte</Badge>,
    paid: <Badge className="text-[10px] bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Paga</Badge>,
  }[statement.status];

  const conciliar = async () => {
    if (!hasDiff) return;
    await addTransaction({
      scope: card.scope,
      companyId: card.companyId,
      cardId: card.id,
      kind: 'expense',
      amount: Math.abs(diff),
      description: diff > 0 ? 'Ajuste de fatura (faltava lançar)' : 'Ajuste de fatura (lancei demais)',
      occurredOn: statement.end,
      status: 'confirmed',
      notes: `Diferença entre o valor real da fatura (${formatBRL(statement.override!)}) e a soma dos lançamentos (${formatBRL(statement.computed)}).`,
    } as any);
    await setCardStatementOverride(cardId, monthISO, null);
    toast.success('Fatura conciliada');
  };

  return (
    <div className="space-y-3">
      {/* Navegador de competência */}
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-1.5 py-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium text-foreground capitalize">{fmtMonth(monthISO)}</div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Fatura */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor da fatura</div>
            <div className="text-3xl font-bold font-mono text-foreground leading-tight">
              {formatBRL(statement.total)}
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Compras de {fmtDay(statement.start)} a {fmtDay(statement.end)}
              {statement.due && <> · vence {fmtDay(statement.due)}</>}
            </div>
          </div>
          {statusBadge}
        </div>

        {statement.paid > 0 && (
          <div className="flex justify-between text-[11px] rounded-xl bg-muted/40 px-2.5 py-1.5">
            <span className="text-muted-foreground">Já pago <b className="text-foreground font-mono">{formatBRL(statement.paid)}</b></span>
            <span className="text-muted-foreground">Falta <b className="text-foreground font-mono">{formatBRL(statement.remaining)}</b></span>
          </div>
        )}

        {/* Ações principais */}
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={() => setExpenseOpen(true)} variant="outline" className="w-full rounded-xl h-11 text-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Lançar gasto neste cartão
          </Button>
          {statement.remaining > 0 && (
            <Button onClick={() => setPayOpen(true)} className="w-full rounded-xl h-11 text-sm">
              <Wallet className="h-4 w-4 mr-1.5" /> Pagar {formatBRL(statement.remaining)}
            </Button>
          )}
        </div>

        {/* Conferência com o banco (secundário) */}
        <div className="pt-1 border-t border-border/60 space-y-1.5">
          {editingTotal ? (
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                <Input
                  value={totalInput}
                  onChange={e => setTotalInput(maskBRLInput(e.target.value))}
                  placeholder="0,00"
                  inputMode="numeric"
                  autoFocus
                  className="rounded-xl h-9 text-sm text-right font-mono pl-7"
                />
              </div>
              <Button
                size="sm"
                className="h-9 rounded-xl"
                onClick={async () => {
                  const v = parseBRLInput(totalInput);
                  if (v <= 0) { toast.error('Valor inválido'); return; }
                  await setCardStatementOverride(cardId, monthISO, v);
                  setEditingTotal(false);
                  toast.success('Valor do banco salvo');
                }}
              >Salvar</Button>
              <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[11px]" onClick={() => setEditingTotal(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setTotalInput(hasOverride ? numberToBRLInput(statement.override!) : ''); setEditingTotal(true); }}
              className="w-full flex items-center justify-between text-[11px]"
            >
              <span className="text-muted-foreground">
                {hasOverride ? 'Valor informado pelo banco' : 'A fatura fechou com outro valor?'}
              </span>
              <span className="text-primary font-medium">
                {hasOverride ? 'ajustar' : 'informar valor'}
              </span>
            </button>
          )}

          {hasOverride && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Soma dos seus lançamentos</span>
              <span className="font-mono text-foreground">{formatBRL(statement.computed)}</span>
            </div>
          )}

          {hasDiff && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10.5px] text-amber-600">
                <Info className="h-3 w-3 shrink-0" />
                <span>
                  {diff > 0
                    ? `Faltam ${formatBRL(diff)} de compras não lançadas.`
                    : `Você lançou ${formatBRL(Math.abs(diff))} a mais do que o banco cobrou.`}
                </span>
              </div>
              <Button onClick={conciliar} variant="outline" size="sm" className="w-full rounded-xl h-9 text-[11px] border-primary/40 text-primary">
                Conciliar com um ajuste de {formatBRL(Math.abs(diff))}
              </Button>
            </div>
          )}
          {hasOverride && !hasDiff && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-500">
              <Info className="h-3 w-3 shrink-0" /> Seus lançamentos batem com o banco.
            </div>
          )}
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Onde gastou nesta fatura
          </div>
          <div className="space-y-2">
            {breakdown.map(row => (
              <div key={row.categoryId || 'none'} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="text-foreground truncate">{row.name}</span>
                    {row.deltaPct !== null && Math.abs(row.deltaPct) >= 5 && (
                      <span className={`shrink-0 ${row.deltaPct > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                        {row.deltaPct > 0 ? '↑' : '↓'}{Math.abs(row.deltaPct).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-foreground shrink-0">{formatBRL(row.total)}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeInst.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Parcelamentos
          </div>
          <div className="space-y-1.5">
            {activeInst.map(p => (
              <div key={p.purchaseGroupId} className="flex items-center justify-between rounded-xl bg-muted/30 px-2.5 py-2 text-[11px]">
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium truncate">{p.description}</div>
                  <div className="text-muted-foreground">
                    {p.paidCount}/{p.total} pagas · faltam {p.remaining}x de {formatBRL(p.installmentAmount)}
                    {p.endsNextMonth && <span className="ml-1 text-amber-500">· acaba em breve</span>}
                  </div>
                </div>
                {p.endsNextMonth && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Compras ({statement.transactions.length})
        </div>
        {statement.transactions.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-3 text-center">
            Nenhum gasto lançado nesta fatura ainda.
          </p>
        )}
        {statement.transactions.slice(0, 60).map(t => {
          const cat = t.categoryId ? catMap.get(t.categoryId) : null;
          return (
            <div key={t.id} className="flex items-center justify-between py-1.5 text-[11px] border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-foreground truncate">{t.description}</div>
                <div className="text-muted-foreground">
                  {fmtDay(t.occurredOn)}
                  {cat && <> · <span style={{ color: cat.color }}>{cat.name}</span></>}
                  {t.installmentTotal && t.installmentTotal > 1 && <> · {t.installmentNo}/{t.installmentTotal}</>}
                </div>
              </div>
              <div className="text-foreground font-medium font-mono shrink-0">{formatBRL(t.amount)}</div>
            </div>
          );
        })}
      </div>

      {payOpen && (
        <TransactionDialog
          open={payOpen}
          onClose={() => setPayOpen(false)}
          scope={card.scope}
          companyId={card.companyId || null}
          prefill={{
            kind: 'card_payment',
            cardId: card.id,
            accountId: card.accountId,
            amount: statement.remaining,
            paidCardMonth: monthISO,
            description: `Pagamento fatura ${fmtMonth(monthISO)} — ${card.name}`,
          }}
        />
      )}

      {expenseOpen && (
        <TransactionDialog
          open={expenseOpen}
          onClose={() => setExpenseOpen(false)}
          scope={card.scope}
          companyId={card.companyId || null}
          prefill={{ kind: 'expense', cardId: card.id, occurredOn: new Date().toISOString().slice(0, 10) }}
        />
      )}
    </div>
  );
}
