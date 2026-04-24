import { Badge } from '@/components/ui/badge';
import { Item } from '@/types/central';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCentral } from '@/contexts/CentralContext';
import { Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseLocalDateTime } from '@/lib/dates';

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  media: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  baixa: 'bg-muted text-muted-foreground border-border',
};

export default function ItemCard({ item }: { item: Item }) {
  const navigate = useNavigate();
  const { updateItem } = useCentral();
  const deadlineDate = parseLocalDateTime(item.deadline);
  const isOverdue = deadlineDate && isPast(deadlineDate) && !isToday(deadlineDate) && item.fase !== 'Concluído';
  const isConcluido = item.fase === 'Concluído';

  const handleToggleConcluido = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConcluido) {
      const restoreFase = item.previousFase || 'Em andamento';
      updateItem(item.id, { fase: restoreFase, previousFase: undefined });
      toast.success(`Reaberto em "${restoreFase}"`);
    } else {
      updateItem(item.id, { fase: 'Concluído', previousFase: item.fase });
      toast.success('Item concluído ✅');
    }
  };

  const visibleTags = item.tags?.slice(0, 3) ?? [];
  const extraTagsCount = (item.tags?.length ?? 0) - visibleTags.length;
  const commentCount = item.comments?.length ?? 0;
  const hasValue = typeof item.value === 'number' && item.value > 0;

  return (
    <div
      onClick={() => navigate(`/items/${item.id}`)}
      className={cn(
        "bg-card border border-border rounded-xl p-3 space-y-2 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]",
        isConcluido && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={handleToggleConcluido}
            aria-label={isConcluido ? 'Reabrir' : 'Concluir'}
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

      {/* Linha de meta info: data, hora, valor, comentários */}
      {(deadlineDate || hasValue || commentCount > 0 || item.person) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-[11px]">
          {deadlineDate && (
            <span className={cn(isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {isOverdue ? '⚠ ' : '📅 '}
              {format(deadlineDate, "dd 'de' MMM", { locale: ptBR })}
              {item.deadlineTime && ` · ${item.deadlineTime}`}
            </span>
          )}
          {hasValue && (
            <span className="text-emerald-700 font-medium">
              💰 R$ {item.value!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {item.person && (
            <span className="text-muted-foreground">👤 {item.person}</span>
          )}
          {commentCount > 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {commentCount}
            </span>
          )}
        </div>
      )}

      {/* Tags resumidas */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {visibleTags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              #{tag}
            </span>
          ))}
          {extraTagsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              +{extraTagsCount}
            </span>
          )}
        </div>
      )}

      {isConcluido && (
        <button
          onClick={handleToggleConcluido}
          className="ml-6 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Reabrir
        </button>
      )}
    </div>
  );
}
