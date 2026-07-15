import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { FinScope, formatBRL } from '@/types/finance';
import { Pencil, Check, X, AlertTriangle, Target, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { maskBRLInput, parseBRLInput } from '@/lib/currency';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CategoriesManager } from './CategoriesManager';



interface Props { scope: FinScope }

const SPENDING_KINDS = new Set([
  'expense', 'card_payment', 'invoice_payment', 'employee_payment',
  'supplier_payment', 'employee_loan', 'tax',
]);

export function CategoryBudgets({ scope }: Props) {
  const { categories, transactions, updateCategory } = useFinance();
  const { monthStart, monthEnd, label: monthLabel } = useFinancePeriod();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const expenseCats = useMemo(
    () => categories.filter(c => c.scope === scope && c.kind === 'expense' && !c.archived),
    [categories, scope],
  );

  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    let uncategorized = 0;
    let total = 0;
    for (const t of transactions) {
      if (t.scope !== scope) continue;
      if (!SPENDING_KINDS.has(t.kind)) continue;
      if (t.status !== 'confirmed') continue;
      if (t.occurredOn < monthStart || t.occurredOn > monthEnd) continue;
      total += t.amount;
      if (t.categoryId) {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      } else {
        uncategorized += t.amount;
      }
    }
    return { map, uncategorized, total };
  }, [transactions, scope, monthStart, monthEnd]);

  const rows = useMemo(() => {
    return expenseCats
      .map(c => ({
        cat: c,
        spent: spentByCat.map.get(c.id) || 0,
        budget: c.monthlyBudget || 0,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [expenseCats, spentByCat]);



  const startEdit = (id: string, current?: number) => {
    setEditingId(id);
    setEditValue(current && current > 0 ? maskBRLInput(String(Math.round(current * 100))) : '');
  };

  const saveBudget = async (id: string) => {
    const v = parseBRLInput(editValue);
    await updateCategory(id, { monthlyBudget: v > 0 ? v : undefined });
    setEditingId(null);
    setEditValue('');
    toast.success(v > 0 ? 'Meta atualizada' : 'Meta removida');
  };

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);

  return (
    <div className="space-y-3">
      {/* Header com mês */}
      <div className="flex items-center justify-end">
        <Sheet>
          <SheetTrigger asChild>
            <button className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> Gerenciar categorias
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Categorias</SheetTitle>
            </SheetHeader>
            <div className="pt-4">
              <CategoriesManager scope={scope} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {monthLabel}
            </div>
            <div className="text-xl font-bold font-mono text-foreground mt-0.5">
              {formatBRL(spentByCat.total)}
            </div>
            <div className="text-[10px] text-muted-foreground">gastos confirmados no mês</div>
          </div>
          {totalBudget > 0 && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Metas
              </div>
              <div className={cn(
                'text-sm font-bold font-mono mt-0.5',
                spentByCat.total > totalBudget ? 'text-destructive' : 'text-foreground',
              )}>
                {formatBRL(totalBudget)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {Math.round((spentByCat.total / totalBudget) * 100)}% usado
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem categoria warning */}
      {spentByCat.uncategorized > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 text-[11px] text-foreground">
            <span className="font-mono font-bold">{formatBRL(spentByCat.uncategorized)}</span>{' '}
            sem categoria — categorize para acompanhar gastos.
          </div>
        </div>
      )}

      {/* Cards por categoria */}
      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-foreground font-semibold">Nenhuma categoria de saída</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cadastre categorias em ⚙ Categorias (cad.).
          </p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(({ cat, spent, budget }) => {
          const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          const overBudget = budget > 0 && spent > budget;
          const warning = budget > 0 && pct >= 80;
          const isEditing = editingId === cat.id;
          const remaining = budget > 0 ? budget - spent : 0;

          return (
            <div
              key={cat.id}
              className={cn(
                'rounded-xl border bg-card p-3 space-y-2',
                overBudget ? 'border-destructive/40' : warning ? 'border-amber-500/40' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg shrink-0"
                  style={{ background: cat.color + '22', border: `1px solid ${cat.color}55` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{cat.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {formatBRL(spent)}
                    {budget > 0 && (
                      <> / <span className="text-foreground/70">{formatBRL(budget)}</span></>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {budget > 0 ? (
                    <>
                      <div className={cn(
                        'text-sm font-bold font-mono',
                        overBudget ? 'text-destructive' : warning ? 'text-amber-500' : 'text-emerald-500',
                      )}>
                        {Math.round(pct)}%
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">
                        {overBudget ? `+${formatBRL(spent - budget)}` : `resta ${formatBRL(remaining)}`}
                      </div>
                    </>
                  ) : (
                    isEditing ? null : (
                      <button
                        onClick={() => startEdit(cat.id, budget)}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <Target className="h-3 w-3" /> Definir meta
                      </button>
                    )
                  )}
                </div>
                {!isEditing && budget > 0 && (
                  <button
                    onClick={() => startEdit(cat.id, budget)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent flex items-center justify-center shrink-0"
                    title="Editar meta"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {budget > 0 && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      overBudget ? 'bg-destructive' : warning ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {/* Edit mode */}
              {isEditing && (
                <div className="flex gap-1.5 pt-1">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(maskBRLInput(e.target.value))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveBudget(cat.id);
                      if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                    }}
                    placeholder="Meta mensal R$"
                    inputMode="numeric"
                    className="rounded-lg h-8 text-xs font-mono flex-1"
                  />
                  <button
                    onClick={() => saveBudget(cat.id)}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditValue(''); }}
                    className="h-8 w-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Apenas lançamentos <strong>confirmados</strong> contam para o gasto do mês.
      </p>
    </div>
  );
}
