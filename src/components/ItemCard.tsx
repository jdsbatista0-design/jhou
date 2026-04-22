import { Badge } from '@/components/ui/badge';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCentral } from '@/contexts/CentralContext';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  media: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  baixa: 'bg-muted text-muted-foreground border-border',
};

export default function ItemCard({ item }: { item: Item }) {
  const navigate = useNavigate();
  const { updateItem } = useCentral();
  const deadlineDate = item.deadline ? new Date(item.deadline) : null;
  const isOverdue = deadlineDate && isPast(deadlineDate) && !isToday(deadlineDate) && item.fase !== 'Concluído';
  const isConcluido = item.fase === 'Concluído';

  const handleToggleConcluido = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFase = isConcluido ? 'Inbox' : 'Concluído';
    updateItem(item.id, { fase: newFase });
    toast.success(isConcluido ? 'Item reaberto' : 'Item concluído ✅');
  };

  return (
    <div
      onClick={() => navigate(`/items/${item.id}`)}
      className={cn(
        "bg-card border border-border rounded-xl p-3 space-y-2 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]",
        isConcluido && "opacity-60"
      )}
    >
      {item.photoUrl && (
        <img src={item.photoUrl} alt="" className="w-full h-28 object-cover rounded-lg" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={handleToggleConcluido}
            className={cn(
              "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
              isConcluido
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
            )}
          >
            {isConcluido && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
          <h3 className={cn("text-sm font-medium text-foreground leading-tight", isConcluido && "line-through")}>{item.title}</h3>
        </div>
        {item.priority && (
          <Badge variant="outline" className={cn('text-[10px] shrink-0', PRIORITY_COLORS[item.priority])}>
            {item.priority}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pl-6">
        <Badge variant="secondary" className="text-[10px]">{item.area}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.fase}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.tipo}</Badge>
      </div>
      {deadlineDate && (
        <p className={cn('text-[11px] pl-6', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
          {isOverdue ? '⚠ Vencido: ' : '📅 '}
          {format(deadlineDate, "dd 'de' MMM", { locale: ptBR })}
        </p>
      )}
      {item.person && <p className="text-[11px] text-muted-foreground pl-6">👤 {item.person}</p>}
    </div>
  );
}
