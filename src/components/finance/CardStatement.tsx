import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Wallet, AlertCircle, Layers, Pencil, X } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TransactionDialog } from './TransactionDialog';

interface Props { cardId: string; }

function fmtMonth(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}


export function CardStatement({ cardId }: Props) {
  const {
    cards, getCardStatement, getCardCategoryBreakdown, getCardActiveInstallments, categories,
  } = useFinance();
  const card = cards.find(c => c.id === cardId);
  const now = new Date();
  const [monthISO, setMonthISO] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [payOpen, setPayOpen] = useState(false);

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

  const statusBadge = {
    open: <Badge variant="secondary" className="text-[10px]">Em aberto</Badge>,
    closed: <Badge variant="destructive" className="text-[10px]">Fechada</Badge>,
    partial: <Badge className="text-[10px] bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">Parcial</Badge>,
    paid: <Badge className="text-[10px] bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Paga</Badge>,
  }[statement.status];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-2 py-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium text-foreground capitalize">
          Fatura de {fmtMonth(monthISO)}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Total da fatura</span>
          {statusBadge}
        </div>
        <div className="text-2xl font-bold text-foreground">{formatBRL(statement.total)}</div>
        <div className="text-[11px] text-muted-foreground">
          Período {new Date(statement.start + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(statement.end + 'T00:00:00').toLocaleDateString('pt-BR')}
          {statement.due && <> · Vence {new Date(statement.due + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
        </div>
        {statement.paid > 0 && (
          <div className="flex justify-between text-[11px] pt-1 border-t border-border">
            <span className="text-muted-foreground">Pago: <b className="text-foreground">{formatBRL(statement.paid)}</b></span>
            <span className="text-muted-foreground">Restante: <b className="text-foreground">{formatBRL(statement.remaining)}</b></span>
          </div>
        )}
        {statement.remaining > 0 && (
          <Button onClick={() => setPayOpen(true)} size="sm" className="w-full rounded-xl h-8 mt-1">
            <Wallet className="h-3.5 w-3.5 mr-1" /> Pagar fatura
          </Button>
        )}
      </div>

      {breakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="text-xs font-semibold text-foreground">Gastos por categoria</div>
          <div className="space-y-2">
            {breakdown.map(row => (
              <div key={row.categoryId || 'none'} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                    <span className="text-foreground">{row.name}</span>
                    {row.deltaPct !== null && (
                      <span className={row.deltaPct > 0 ? 'text-destructive' : 'text-emerald-500'}>
                        {row.deltaPct > 0 ? '↑' : '↓'} {Math.abs(row.deltaPct).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-foreground">{formatBRL(row.total)}</span>
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
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Parcelamentos em andamento
          </div>
          <div className="space-y-1.5">
            {activeInst.map(p => (
              <div key={p.purchaseGroupId} className="flex items-center justify-between rounded-lg bg-muted/30 px-2 py-1.5 text-[11px]">
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium truncate">{p.description}</div>
                  <div className="text-muted-foreground">
                    {p.paidCount}/{p.total} pagas · faltam {p.remaining} de {formatBRL(p.installmentAmount)}
                    {p.endsNextMonth && <span className="ml-1 text-amber-500">· acaba em breve</span>}
                  </div>
                </div>
                {p.endsNextMonth && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {statement.transactions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
          <div className="text-xs font-semibold text-foreground mb-1">Compras ({statement.transactions.length})</div>
          {statement.transactions.slice(0, 40).map(t => {
            const cat = t.categoryId ? catMap.get(t.categoryId) : null;
            return (
              <div key={t.id} className="flex items-center justify-between py-1 text-[11px] border-b border-border/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-foreground truncate">{t.description}</div>
                  <div className="text-muted-foreground">
                    {new Date(t.occurredOn + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {cat && <> · <span style={{ color: cat.color }}>{cat.name}</span></>}
                    {t.installmentTotal && t.installmentTotal > 1 && <> · {t.installmentNo}/{t.installmentTotal}</>}
                  </div>
                </div>
                <div className="text-foreground font-medium">{formatBRL(t.amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      {payOpen && (
        <TransactionDialog
          open={payOpen}
          onClose={() => setPayOpen(false)}
          scope={card.scope}
          companyId={card.companyId || null}
        />
      )}
    </div>
  );
}
