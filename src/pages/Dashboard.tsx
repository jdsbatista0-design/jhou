import { useCentral } from '@/contexts/CentralContext';
import DashboardStories from '@/components/DashboardStories';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function Dashboard() {
  const { items, inbox, agendaEntries, loading } = useCentral();
  const now = new Date();

  const isEmpty = items.length === 0 && inbox.length === 0 && agendaEntries.length === 0;
  const showLoading = loading && isEmpty;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
          {format(now, "EEEE", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {format(now, "dd 'de' MMMM", { locale: ptBR })}
        </h1>
      </div>

      {showLoading ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground animate-pulse">Carregando sua Central…</p>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👋</p>
          <p className="text-sm font-medium text-foreground">Bem-vindo à Central</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
            Toque no botão <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold align-middle">+</span> para capturar sua primeira ideia.
          </p>
        </div>
      ) : (
        <DashboardStories />
      )}
    </div>
  );
}
