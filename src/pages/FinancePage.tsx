import { lazy, Suspense, useEffect, useState } from 'react';
import { Plus, Wallet, CreditCard, ListChecks, TrendingUp, Receipt, Settings as SettingsIcon, ChevronDown, CheckSquare, PieChart } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { FinancePeriodProvider } from '@/contexts/FinancePeriodContext';
import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BillsToPay = lazy(() => import('@/components/finance/BillsToPay').then(m => ({ default: m.BillsToPay })));
const TransactionsList = lazy(() => import('@/components/finance/TransactionsList').then(m => ({ default: m.TransactionsList })));
const FinanceOverview = lazy(() => import('@/components/finance/FinanceOverview').then(m => ({ default: m.FinanceOverview })));
const AccountsManager = lazy(() => import('@/components/finance/AccountsManager').then(m => ({ default: m.AccountsManager })));
const CardsManager = lazy(() => import('@/components/finance/CardsManager').then(m => ({ default: m.CardsManager })));
const CategoriesManager = lazy(() => import('@/components/finance/CategoriesManager').then(m => ({ default: m.CategoriesManager })));
const CategoryBudgets = lazy(() => import('@/components/finance/CategoryBudgets').then(m => ({ default: m.CategoryBudgets })));
const TransactionDialog = lazy(() => import('@/components/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })));


type Section = 'bills' | 'budgets' | 'overview' | 'transactions' | 'accounts' | 'cards' | 'categories';

const SectionFallback = () => (
  <div className="text-[11px] text-muted-foreground animate-pulse pt-3">Carregando…</div>
);

function FinanceInner() {
  const { scope, setScope, loading } = useFinance();
  const [section, setSection] = useState<Section>('transactions');
  const [txOpen, setTxOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Força escopo PF nesta fase — PJ desabilitado por enquanto
  useEffect(() => {
    if (scope !== 'pf') setScope('pf');
  }, [scope, setScope]);

  const mainSections: { id: Section; label: string; icon: any }[] = [
    { id: 'transactions', label: 'Tudo', icon: ListChecks },
    { id: 'bills', label: 'A Pagar', icon: CheckSquare },
    { id: 'budgets', label: 'Categorias', icon: PieChart },
    { id: 'overview', label: 'Resumo', icon: TrendingUp },
  ];

  const configSections: { id: Section; label: string; icon: any }[] = [
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'categories', label: 'Categorias (cad.)', icon: Receipt },
  ];

  return (
    <div className="space-y-3">
      {loading && (
        <div className="text-[11px] text-muted-foreground animate-pulse">Atualizando finanças…</div>
      )}

      {/* Section nav */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
          {mainSections.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setSection(s.id); setShowConfig(false); }}
                className={cn(
                  'shrink-0 h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors',
                  active
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowConfig(v => !v)}
            className={cn(
              'shrink-0 h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors',
              showConfig || configSections.some(s => s.id === section)
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card text-muted-foreground border-border hover:text-foreground',
            )}
            title="Cadastros: contas, cartões, categorias…"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <ChevronDown className={cn('h-3 w-3 transition-transform', showConfig && 'rotate-180')} />
          </button>
        </div>

        {showConfig && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {configSections.map(s => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'shrink-0 h-8 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors',
                    active
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button
        onClick={() => setTxOpen(true)}
        className="w-full rounded-2xl h-11 font-semibold"
      >
        <Plus className="h-4 w-4 mr-1" /> Novo lançamento
      </Button>

      <div className="pt-1">
        <Suspense fallback={<SectionFallback />}>
          {section === 'bills' && <BillsToPay scope="pf" companyId={null} />}
          {section === 'budgets' && <CategoryBudgets scope="pf" />}
          {section === 'overview' && <FinanceOverview scope="pf" companyId={null} />}
          {section === 'transactions' && <TransactionsList scope="pf" companyId={null} />}
          {section === 'accounts' && <AccountsManager scope="pf" companyId={null} />}
          {section === 'cards' && <CardsManager scope="pf" companyId={null} />}
          {section === 'categories' && <CategoriesManager scope="pf" />}
        </Suspense>
      </div>

      {txOpen && (
        <Suspense fallback={null}>
          <TransactionDialog
            open={txOpen}
            onClose={() => setTxOpen(false)}
            scope="pf"
            companyId={null}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function FinancePage() {
  return <FinanceInner />;
}
