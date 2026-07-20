import { useCentral } from '@/contexts/CentralContext';
import HomeAgora from '@/components/HomeAgora';
import HomeToday from '@/components/HomeToday';
import HomePending from '@/components/HomePending';
import { Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { items, inbox, agendaEntries, loading } = useCentral();

  const isEmpty = items.length === 0 && inbox.length === 0 && agendaEntries.length === 0;
  const showLoading = loading && isEmpty;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-foreground leading-tight">Hoje</h1>

      {showLoading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-lg bg-surface border border-surface-2 animate-pulse" />
          <div className="h-24 rounded-lg bg-surface border border-surface-2 animate-pulse" />
          <div className="h-24 rounded-lg bg-surface border border-surface-2 animate-pulse" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16">
          <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" aria-hidden />
          <p className="text-sm font-medium text-foreground">Bem-vindo à Central</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
            Toque no botão <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold align-middle">+</span> para capturar sua primeira ideia.
          </p>
        </div>
      ) : (
        <>
          <HomeAgora />
          <HomeToday />
          <HomePending />
        </>
      )}
    </div>
  );
}
