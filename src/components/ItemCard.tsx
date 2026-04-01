import { Badge } from '@/components/ui/badge';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'bg-destructive/15 text-destructive border-destructive/30',
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  media: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  baixa: 'bg-muted text-muted-foreground border-border',
};

export default function ItemCard({ item }: { item: Item }) {
  const navigate = useNavigate();
  const deadlineDate = item.deadline ? new Date(item.deadline) : null;
  const isOverdue = deadlineDate && isPast(deadlineDate) && !isToday(deadlineDate) && item.fase !== 'Concluído';

  return (
    <div
      onClick={() => navigate(`/items/${item.id}`)}
      className="bg-card border border-border rounded-xl p-3 space-y-2 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground leading-tight flex-1">{item.title}</h3>
        {item.priority && (
          <Badge variant="outline" className={cn('text-[10px] shrink-0', PRIORITY_COLORS[item.priority])}>
            {item.priority}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">{item.area}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.fase}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.tipo}</Badge>
      </div>
      {deadlineDate && (
        <p className={cn('text-[11px]', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
          {isOverdue ? '⚠ Vencido: ' : '📅 '}
          {format(deadlineDate, "dd 'de' MMM", { locale: ptBR })}
        </p>
      )}
      {item.person && <p className="text-[11px] text-muted-foreground">👤 {item.person}</p>}
    </div>
  );
}
