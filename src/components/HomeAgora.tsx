import { useCentral } from '@/contexts/CentralContext';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { parseLocalDateTime } from '@/lib/dates';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function HomeAgora() {
  const { agendaEntries } = useCentral();
  const navigate = useNavigate();

  const { current, next } = useMemo(() => {
    const now = Date.now();
    const todays = agendaEntries
      .filter(e => {
        const d = new Date(e.datetime);
        return isToday(d);
      })
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    // "Agora" = último evento que começou até 90min atrás, ainda "corrente"
    const current = todays.find(e => {
      const start = new Date(e.datetime).getTime();
      return start <= now && now - start < 90 * 60 * 1000;
    });
    const next = todays.find(e => new Date(e.datetime).getTime() > now);
    return { current, next };
  }, [agendaEntries]);

  if (!current && !next) return null;

  return (
    <section className="rounded-xl border border-surface-2 bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Agora</div>
      {current ? (
        <button
          onClick={() => current.item ? navigate(`/item/${current.item.id}`) : navigate('/agenda')}
          className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground truncate">{current.title}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(current.datetime), "HH:mm", { locale: ptBR })} · em andamento
            </div>
          </div>
        </button>
      ) : (
        <div className="text-sm text-muted-foreground px-2 py-1">Nada acontecendo agora</div>
      )}

      {next && (
        <button
          onClick={() => next.item ? navigate(`/item/${next.item.id}`) : navigate('/agenda')}
          className="w-full text-left flex items-center gap-3 p-2 mt-1 rounded-lg hover:bg-surface-2 transition-colors border-t border-surface-2 pt-3"
        >
          <div className="h-10 w-10 rounded-lg bg-surface-2 text-foreground flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Próximo</div>
            <div className="text-sm font-medium text-foreground truncate">{next.title}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(next.datetime), "HH:mm", { locale: ptBR })}
            </div>
          </div>
        </button>
      )}
    </section>
  );
}
