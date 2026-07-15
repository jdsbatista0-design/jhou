import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { useFinancePeriod } from '@/contexts/FinancePeriodContext';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export function MonthNavigator({ className }: Props) {
  const { label, isCurrentMonth, goPrev, goNext, goToday } = useFinancePeriod();

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        onClick={goPrev}
        aria-label="Mês anterior"
        className="h-9 w-9 rounded-xl border border-border bg-card text-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 h-9 rounded-xl border border-border bg-card px-3 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground truncate">{label}</span>
      </div>

      <button
        onClick={goNext}
        aria-label="Próximo mês"
        className="h-9 w-9 rounded-xl border border-border bg-card text-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        onClick={goToday}
        disabled={isCurrentMonth}
        aria-label="Ir para o mês atual"
        className={cn(
          'h-9 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors',
          isCurrentMonth
            ? 'bg-muted border-border text-muted-foreground cursor-default'
            : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20',
        )}
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Hoje
      </button>
    </div>
  );
}
