import { lazy, Suspense, useMemo, useState } from 'react';
import { Building2, User, Plus, Wallet, CreditCard, ListChecks, Users, TrendingUp, Receipt, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Lazy-load every section — só baixa o JS quando o usuário abre a aba
const TransactionsList = lazy(() => import('@/components/finance/TransactionsList').then(m => ({ default: m.TransactionsList })));
const FinanceOverview = lazy(() => import('@/components/finance/FinanceOverview').then(m => ({ default: m.FinanceOverview })));
const AccountsManager = lazy(() => import('@/components/finance/AccountsManager').then(m => ({ default: m.AccountsManager })));
const CardsManager = lazy(() => import('@/components/finance/CardsManager').then(m => ({ default: m.CardsManager })));
const CategoriesManager = lazy(() => import('@/components/finance/CategoriesManager').then(m => ({ default: m.CategoriesManager })));
const PeopleManager = lazy(() => import('@/components/finance/PeopleManager').then(m => ({ default: m.PeopleManager })));
const CompaniesManager = lazy(() => import('@/components/finance/CompaniesManager').then(m => ({ default: m.CompaniesManager })));
const TransactionDialog = lazy(() => import('@/components/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })));

type Section = 'overview' | 'transactions' | 'accounts' | 'cards' | 'categories' | 'people' | 'companies';

const SectionFallback = () => (
  <div className="text-[11px] text-muted-foreground animate-pulse pt-3">Carregando…</div>
);

function FinanceInner() {
  const { scope, setScope, companies, selectedCompanyId, setSelectedCompanyId, loading } = useFinance();
  const [section, setSection] = useState<Section>('transactions');
  const [txOpen, setTxOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const activeCompanies = useMemo(() => companies.filter(c => !c.archived), [companies]);

  const effectiveCompanyId = useMemo(() => {
    if (scope !== 'pj') return null;
    if (selectedCompanyId === 'all') return 'all';
    if (selectedCompanyId && activeCompanies.find(c => c.id === selectedCompanyId)) return selectedCompanyId;
    return activeCompanies[0]?.id || null;
  }, [scope, selectedCompanyId, activeCompanies]);

  const mainSections: { id: Section; label: string; icon: any }[] = [
    { id: 'transactions', label: 'Movimentações', icon: ListChecks },
    { id: 'overview', label: 'Resumo', icon: TrendingUp },
  ];

  const configSections: { id: Section; label: string; icon: any }[] = [
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'categories', label: 'Categorias', icon: Receipt },
    ...(scope === 'pj'
      ? [
          { id: 'people' as const, label: 'Pessoas', icon: Users },
          { id: 'companies' as const, label: 'Empresas', icon: Building2 },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {loading && (
        <div className="text-[11px] text-muted-foreground animate-pulse">Atualizando finanças…</div>
      )}

      {/* Header: PF / PJ toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setScope('pf'); setSection('overview'); }}
          className={cn(
            'flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all',
            scope === 'pf'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          <User className="h-4 w-4" />
          Pessoa Física
        </button>
        <button
          onClick={() => { setScope('pj'); setSection('overview'); }}
          className={cn(
            'flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all',
            scope === 'pj'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-card text-muted-foreground border-border hover:text-foreground',
          )}
        >
          <Building2 className="h-4 w-4" />
          Pessoa Jurídica
        </button>
      </div>

      {/* PJ company selector */}
      {scope === 'pj' && activeCompanies.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedCompanyId('all')}
            className={cn(
              'shrink-0 h-8 px-3 rounded-full border text-xs font-medium transition-colors',
              effectiveCompanyId === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border',
            )}
          >
            Todas
          </button>
          {activeCompanies.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompanyId(c.id)}
              className={cn(
                'shrink-0 h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors',
                effectiveCompanyId === c.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {scope === 'pj' && activeCompanies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa cadastrada ainda. Crie sua primeira empresa para começar a registrar lançamentos PJ.
          </p>
          <Button size="sm" onClick={() => setSection('companies')} className="rounded-xl">
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar empresa
          </Button>
        </div>
      )}

      {/* Section nav */}
      {(scope === 'pf' || activeCompanies.length > 0) && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {mainSections.map(s => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSection(s.id); setShowConfig(false); }}
                  className={cn(
                    'flex-1 h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
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
                'h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors',
                showConfig || configSections.some(s => s.id === section)
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground',
              )}
              title="Configurações: contas, cartões, categorias…"
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
      )}

      {(scope === 'pf' || (scope === 'pj' && activeCompanies.length > 0)) && (
        <Button
          onClick={() => setTxOpen(true)}
          className="w-full rounded-2xl h-11 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo lançamento
        </Button>
      )}

      {/* Body — só monta a seção ativa */}
      <div className="pt-1">
        <Suspense fallback={<SectionFallback />}>
          {section === 'overview' && <FinanceOverview scope={scope} companyId={effectiveCompanyId} />}
          {section === 'transactions' && <TransactionsList scope={scope} companyId={effectiveCompanyId} />}
          {section === 'accounts' && <AccountsManager scope={scope} companyId={effectiveCompanyId} />}
          {section === 'cards' && <CardsManager scope={scope} companyId={effectiveCompanyId} />}
          {section === 'categories' && <CategoriesManager scope={scope} />}
          {section === 'people' && scope === 'pj' && <PeopleManager companyId={effectiveCompanyId} />}
          {section === 'companies' && scope === 'pj' && <CompaniesManager />}
        </Suspense>
      </div>

      {/* Dialog também só carrega quando abrir */}
      {txOpen && (
        <Suspense fallback={null}>
          <TransactionDialog
            open={txOpen}
            onClose={() => setTxOpen(false)}
            scope={scope}
            companyId={effectiveCompanyId === 'all' ? null : effectiveCompanyId}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function FinancePage() {
  return <FinanceInner />;
}
