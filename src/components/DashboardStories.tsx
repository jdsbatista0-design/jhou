import { useRef, useState, useEffect } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import { isToday, isPast, format, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemCard from './ItemCard';
import InboxEntryCard from './InboxEntryCard';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Inbox, AlarmClock, Flame, Ban, CalendarDays, Rocket, Sparkles, Check } from 'lucide-react';
import { parseLocalDateTime } from '@/lib/dates';
import { toast } from 'sonner';

interface StoryDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  accent: string; // tailwind classes for ring/badge
  empty: { emoji: string; text: string };
  render: () => React.ReactNode;
}

export default function DashboardStories() {
  const { items, agendaEntries, inbox, updateItem, deleteEvent } = useCentral();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const now = new Date();
  const safeDate = (value?: string) => parseLocalDateTime(value) || (value ? new Date(value) : null);

  const pendingInbox = inbox.filter(e => e.status === 'pending');
  const todayAgenda = agendaEntries.filter(e => {
    const date = safeDate(e.datetime);
    return date ? isToday(date) : false;
  });
  const todayItems = items.filter(i => {
    const date = safeDate(i.deadline);
    return date ? isToday(date) && i.fase !== 'Concluído' : false;
  });
  const urgentes = items.filter(i => i.tags.includes('urgente') && i.fase !== 'Concluído');
  const travado = items.filter(i => i.fase === 'Travado');
  const overdue = items.filter(i => {
    const date = safeDate(i.deadline);
    return date ? isPast(date) && !isToday(date) && i.fase !== 'Concluído' : false;
  });
  const andando = items.filter(i => i.fase === 'Em andamento');

  // Build story list — only include those with content (else empty placeholder still useful?)
  const stories: StoryDef[] = [
    {
      key: 'agora',
      label: 'Agora',
      icon: <AlarmClock className="h-4 w-4" />,
      count: todayAgenda.length + todayItems.length,
      accent: 'from-primary/20 to-primary/5 ring-primary/30',
      empty: { emoji: '☕', text: 'Sem compromissos agora. Aproveite!' },
      render: () => (
        <div className="space-y-2">
          {todayAgenda.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agenda de hoje</p>
              {todayAgenda.map(e => {
                const linkedItem = e.source === 'item'
                  ? items.find(i => i.id === e.sourceId)
                  : undefined;
                const isConcluido = linkedItem?.fase === 'Concluído';
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-colors",
                      isConcluido && "opacity-60"
                    )}
                    onClick={() => e.source === 'item' ? navigate(`/items/${e.sourceId}`) : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (e.source === 'item') {
                            const newFase = isConcluido ? 'Inbox' : 'Concluído';
                            updateItem(e.sourceId, { fase: newFase });
                            toast.success(isConcluido ? 'Item reaberto' : 'Item concluído ✅');
                          } else {
                            deleteEvent(e.sourceId);
                            toast.success('Evento removido');
                          }
                        }}
                        className={cn(
                          "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isConcluido
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                        )}
                        aria-label={isConcluido ? 'Reabrir' : 'Concluir'}
                      >
                        {isConcluido && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium text-foreground flex-1", isConcluido && "line-through")}>{e.title}</p>
                          <Badge variant="outline" className="text-[9px] shrink-0">{e.type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">🕐 {format(safeDate(e.datetime) || new Date(e.datetime), 'HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {todayItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tarefas para hoje</p>
              {todayItems.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'urgentes',
      label: 'Urgentes',
      icon: <Flame className="h-4 w-4" />,
      count: urgentes.length + overdue.length,
      accent: 'from-destructive/20 to-destructive/5 ring-destructive/30',
      empty: { emoji: '✅', text: 'Nenhuma urgência. Está tudo sob controle.' },
      render: () => (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">⚠ Vencidos</p>
              {overdue.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
          {urgentes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-wide">🔴 Urgentes</p>
              {urgentes.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'inbox',
      label: 'Inbox',
      icon: <Inbox className="h-4 w-4" />,
      count: pendingInbox.length,
      accent: 'from-amber-500/20 to-amber-500/5 ring-amber-500/30',
      empty: { emoji: '📥', text: 'Inbox vazia. Capture sua próxima ideia.' },
      render: () => (
        <div className="space-y-2">
          {pendingInbox.map(entry => (
            <InboxEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ),
    },
    {
      key: 'em-andamento',
      label: 'Em andamento',
      icon: <Rocket className="h-4 w-4" />,
      count: andando.length,
      accent: 'from-blue-500/20 to-blue-500/5 ring-blue-500/30',
      empty: { emoji: '🚀', text: 'Nada em execução. Pegue um item para começar.' },
      render: () => (
        <div className="space-y-2">
          {andando.map(i => <ItemCard key={i.id} item={i} />)}
        </div>
      ),
    },
    {
      key: 'travado',
      label: 'Travado',
      icon: <Ban className="h-4 w-4" />,
      count: travado.length,
      accent: 'from-orange-500/20 to-orange-500/5 ring-orange-500/30',
      empty: { emoji: '🆗', text: 'Sem bloqueios. Fluxo livre.' },
      render: () => (
        <div className="space-y-2">
          {travado.map(i => <ItemCard key={i.id} item={i} />)}
        </div>
      ),
    },
  ];

  // Track active card via scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let timeout: NodeJS.Timeout;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const cards = el.querySelectorAll<HTMLElement>('[data-story-card]');
        const center = el.scrollLeft + el.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        cards.forEach((c, i) => {
          const cardCenter = c.offsetLeft + c.offsetWidth / 2;
          const dist = Math.abs(center - cardCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        });
        setActiveIdx(bestIdx);
      }, 60);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToIdx = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>('[data-story-card]')[i];
    if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {/* Tabs (chips) */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {stories.map((s, i) => (
          <button
            key={s.key}
            onClick={() => scrollToIdx(i)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              activeIdx === i
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {s.icon}
            <span>{s.label}</span>
            {s.count > 0 && (
              <span className={cn(
                'min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                activeIdx === i ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground'
              )}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 no-scrollbar pb-2"
        style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
      >
        {stories.map((s, i) => (
          <div
            key={s.key}
            data-story-card
            className="snap-start shrink-0 w-[88vw] max-w-[440px]"
          >
            <div className={cn(
              'rounded-2xl bg-gradient-to-br ring-1 p-3 min-h-[300px]',
              s.accent
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-card flex items-center justify-center text-foreground">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.count} {s.count === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{i + 1}/{stories.length}</span>
              </div>
              {s.count === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">{s.empty.emoji}</p>
                  <p className="text-xs text-muted-foreground">{s.empty.text}</p>
                </div>
              ) : (
                <div className="max-h-[58vh] overflow-y-auto no-scrollbar -mx-1 px-1">
                  {s.render()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Final story: visão completa */}
        <div data-story-card className="snap-start shrink-0 w-[88vw] max-w-[440px]">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-muted ring-1 ring-border p-4 min-h-[300px] flex flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm font-bold text-foreground">Quer ver tudo?</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Acesse a gestão completa no Painel.</p>
            <button
              onClick={() => navigate('/reports')}
              className="bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Abrir Painel
            </button>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {stories.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIdx(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              activeIdx === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )}
            aria-label={`Ir para card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
