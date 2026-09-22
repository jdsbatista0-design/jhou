import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CreditCard, FileUp, Settings2 } from 'lucide-react';

import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/types/finance';
import { cn } from '@/lib/utils';

const CardStatement = lazy(() => import('@/components/finance/CardStatement').then(m => ({ default: m.CardStatement })));
const CardsForecast = lazy(() => import('@/components/finance/CardsForecast').then(m => ({ default: m.CardsForecast })));
const CardsTopCategories = lazy(() => import('@/components/finance/CardsTopCategories').then(m => ({ default: m.CardsTopCategories })));
const CardsManager = lazy(() => import('@/components/finance/CardsManager').then(m => ({ default: m.CardsManager })));
const ImportInvoiceDialog = lazy(() => import('@/components/finance/ImportInvoiceDialog').then(m => ({ default: m.ImportInvoiceDialog })));

type View = 'statement' | 'forecast' | 'categories' | 'manage';

const VIEWS: { id: View; label: string }[] = [
  { id: 'statement', label: 'Fatura' },
  { id: 'forecast', label: 'Próximos meses' },
  { id: 'categories', label: 'Onde gasto' },
  { id: 'manage', label: 'Meus cartões' },
];

const Fallback = () => (
  <div className="text-[11px] text-muted-foreground animate-pulse pt-3">Carregando…</div>
);

export default function CardsPage() {
  const { cards, scope, setScope, getCardStatement } = useFinance();
  const [view, setView] = useState<View>('statement');
  const [importOpen, setImportOpen] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);

  useEffect(() => {
    if (scope !== 'pf') setScope('pf');
  }, [scope, setScope]);

  const active = useMemo(
    () => cards.filter(c => !c.archived && c.scope === 'pf'),
    [cards],
  );

  useEffect(() => {
    if (!cardId && active.length) setCardId(active[0].id);
    if (cardId && !active.some(c => c.id === cardId)) setCardId(active[0]?.id ?? null);
  }, [active, cardId]);

  const monthISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const totals = useMemo(() => {
    let remaining = 0;
    let next: { name: string; dueOn: string } | null = null;
    for (const c of active) {
      const st = getCardStatement(c.id, monthISO);
      remaining += st.remaining;
      if (st.due && st.remaining > 0 && (!next || st.due < next.dueOn)) {
        next = { name: c.name, dueOn: st.due };
      }
    }
    return { remaining, next };
  }, [active, getCardStatement, monthISO]);

  const dueLabel = totals.next
    ? new Date(totals.next.dueOn + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null;

  return (
    <div className="space-y-4">
      {/* Painel dominante */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-panel">
        <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70 flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Falta pagar nos cartões
        </p>
        <p className="font-display text-3xl font-bold leading-tight mt-1" data-mono>
          {formatBRL(totals.remaining)}
        </p>
        <p className="text-[11px] opacity-75 mt-1">
          {active.length} {active.length === 1 ? 'cartão' : 'cartões'}
          {totals.next && <> · próxima fatura {totals.next.name} vence {dueLabel}</>}
        </p>
      </div>

      {/* Seletor de cartão */}
      {active.length > 1 && view === 'statement' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {active.map(c => (
            <button
              key={c.id}
              onClick={() => setCardId(c.id)}
              className={cn(
                'shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors',
                cardId === c.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-surface border-border text-muted-foreground',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold transition-colors',
              view === v.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border text-muted-foreground',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setImportOpen(true)}
        className="w-full h-12 rounded-2xl font-semibold border-primary/30 text-primary"
      >
        <FileUp className="h-4 w-4 mr-1.5" /> Importar fatura em PDF
      </Button>

      <Suspense fallback={<Fallback />}>
        {view === 'statement' && (
          cardId ? (
            <CardStatement cardId={cardId} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center space-y-2">
              <p className="text-sm font-semibold">Nenhum cartão cadastrado</p>
              <p className="text-[11px] text-muted-foreground">Cadastre seu primeiro cartão em “Meus cartões”.</p>
              <Button variant="outline" className="rounded-xl h-10" onClick={() => setView('manage')}>
                <Settings2 className="h-4 w-4 mr-1.5" /> Meus cartões
              </Button>
            </div>
          )
        )}
        {view === 'forecast' && <CardsForecast />}
        {view === 'categories' && <CardsTopCategories />}
        {view === 'manage' && <CardsManager scope="pf" companyId={null} />}
      </Suspense>

      {importOpen && (
        <Suspense fallback={null}>
          <ImportInvoiceDialog open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
