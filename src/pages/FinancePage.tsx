import { useMemo, useState } from 'react';
import { Building2, User, Plus, Wallet, CreditCard, ListChecks, Users, TrendingUp, Receipt, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { FinanceProvider, useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBRL, FinScope, TX_KIND_LABELS } from '@/types/finance';
import { CompaniesManager } from '@/components/finance/CompaniesManager';
import { AccountsManager } from '@/components/finance/AccountsManager';
import { CardsManager } from '@/components/finance/CardsManager';
import { TransactionsList } from '@/components/finance/TransactionsList';
import { TransactionDialog } from '@/components/finance/TransactionDialog';
import { CategoriesManager } from '@/components/finance/CategoriesManager';
import { PeopleManager } from '@/components/finance/PeopleManager';
import { FinanceOverview } from '@/components/finance/FinanceOverview';

type Section = 'overview' | 'transactions' | 'accounts' | 'cards' | 'categories' | 'people' | 'companies';

function FinanceInner() {
  const { scope, setScope, companies, selectedCompanyId, setSelectedCompanyId, loading } = useFinance();
  const [section, setSection] = useState<Section>('transactions');
  const [txOpen, setTxOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const activeCompanies = companies.filter(c => !c.archived);

  // Auto-pick first company when entering PJ for the first time
  const effectiveCompanyId = useMemo(() => {
    if (scope !== 'pj') return null;
    if (selectedCompanyId === 'all') return 'all';
    if (selectedCompanyId && activeCompanies.find(c => c.id === selectedCompanyId)) return selectedCompanyId;
    return activeCompanies[0]?.id || null;
  }, [scope, selectedCompanyId, activeCompanies]);

  // Main sections (always visible)
  const mainSections: { id: Section; label: string; icon: any }[] = [
    { id: 'transactions', label: 'Movimentações', icon: ListChecks },
    { id: 'overview', label: 'Resumo', icon: TrendingUp },
  ];

  // Config sections (under "⚙ Configurações" expandable)
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

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Carregando finanças…</div>;
  }

  return (
    <div className="space-y-3">
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {sections.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  'shrink-0 h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors',
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
        </div>
      )}

      {/* Quick add button (transactions) */}
      {(scope === 'pf' || (scope === 'pj' && activeCompanies.length > 0)) && (
        <Button
          onClick={() => setTxOpen(true)}
          className="w-full rounded-2xl h-11 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo lançamento
        </Button>
      )}

      {/* Body */}
      <div className="pt-1">
        {section === 'overview' && <FinanceOverview scope={scope} companyId={effectiveCompanyId} />}
        {section === 'transactions' && <TransactionsList scope={scope} companyId={effectiveCompanyId} />}
        {section === 'recurrences' && <RecurrencesManager scope={scope} companyId={effectiveCompanyId} />}
        {section === 'accounts' && <AccountsManager scope={scope} companyId={effectiveCompanyId} />}
        {section === 'cards' && <CardsManager scope={scope} companyId={effectiveCompanyId} />}
        {section === 'categories' && <CategoriesManager scope={scope} />}
        {section === 'people' && scope === 'pj' && <PeopleManager companyId={effectiveCompanyId} />}
        {section === 'companies' && scope === 'pj' && <CompaniesManager />}
      </div>

      <TransactionDialog
        open={txOpen}
        onClose={() => setTxOpen(false)}
        scope={scope}
        companyId={effectiveCompanyId === 'all' ? null : effectiveCompanyId}
      />
    </div>
  );
}

export default function FinancePage() {
  return (
    <FinanceProvider>
      <FinanceInner />
    </FinanceProvider>
  );
}
