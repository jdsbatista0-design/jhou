import { useCentral } from '@/contexts/CentralContext';
import ItemCard from '@/components/ItemCard';
import VisionSection from '@/components/VisionSection';
import QuickInput from '@/components/QuickInput';
import InboxEntryCard from '@/components/InboxEntryCard';
import { isToday, isThisWeek, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { items, agendaEntries, inbox } = useCentral();
  const now = new Date();
  const pendingInbox = inbox.filter(e => e.status === 'pending');

  const todayAgenda = agendaEntries.filter(e => isToday(new Date(e.datetime)));
  const todayItems = items.filter(i => i.deadline && isToday(new Date(i.deadline)) && i.fase !== 'Concluído');
  const weekItems = items.filter(i => i.deadline && isThisWeek(new Date(i.deadline), { weekStartsOn: 1 }) && !isToday(new Date(i.deadline)) && i.fase !== 'Concluído');
  const andando = items.filter(i => i.fase === 'Andando');
  const aguardando = items.filter(i => i.fase === 'Aguardando');
  const travado = items.filter(i => i.fase === 'Travado');
  const oportunidades = items.filter(i => i.tipo === 'Oportunidade' && i.fase !== 'Concluído');
  const semAcao = items.filter(i => differenceInDays(now, new Date(i.updatedAt)) >= 7 && i.fase !== 'Concluído');
  const concluidos = items.filter(i => i.fase === 'Concluído' && differenceInDays(now, new Date(i.updatedAt)) <= 7);
  const comValor = items.filter(i => i.value && i.value > 0 && i.fase !== 'Concluído');
  const urgentes = items.filter(i => i.priority === 'urgente' && i.fase !== 'Concluído');
  const overdue = items.filter(i => i.deadline && new Date(i.deadline) < now && i.fase !== 'Concluído' && !isToday(new Date(i.deadline)));

  const alertCount = urgentes.length + travado.length + overdue.length;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Central</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <QuickInput />

      {/* Inbox pendente */}
      {pendingInbox.length > 0 && (
        <VisionSection title="Inbox pendente" icon="📥" count={pendingInbox.length}>
          {pendingInbox.map(entry => (
            <InboxEntryCard key={entry.id} entry={entry} />
          ))}
        </VisionSection>
      )}

      {/* Alertas */}
      {alertCount > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-destructive">🚨 {alertCount} alerta(s)</p>
          {urgentes.length > 0 && <p className="text-[11px] text-muted-foreground">🔴 {urgentes.length} urgente(s)</p>}
          {travado.length > 0 && <p className="text-[11px] text-muted-foreground">🚫 {travado.length} travado(s)</p>}
          {overdue.length > 0 && <p className="text-[11px] text-muted-foreground">⚠️ {overdue.length} vencido(s)</p>}
        </div>
      )}

      {todayAgenda.length > 0 && (
        <VisionSection title="Agenda de hoje" icon="🕐" count={todayAgenda.length}>
          {todayAgenda.map(e => (
            <div key={e.id} className="bg-card border border-border rounded-xl p-3">
              <p className="text-sm font-medium text-foreground">{e.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[11px] text-muted-foreground">{format(new Date(e.datetime), 'HH:mm')} · {e.type}</p>
                <Badge variant={e.source === 'item' ? 'secondary' : 'outline'} className="text-[9px]">
                  {e.source === 'item' ? '📋' : '📅'}
                </Badge>
              </div>
            </div>
          ))}
        </VisionSection>
      )}

      <VisionSection title="Hoje" icon="📅" count={todayItems.length}>
        {todayItems.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Esta semana" icon="📆" count={weekItems.length} defaultOpen={false}>
        {weekItems.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Em andamento" icon="🚀" count={andando.length}>
        {andando.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Aguardando" icon="⏳" count={aguardando.length}>
        {aguardando.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Travado" icon="🔴" count={travado.length}>
        {travado.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Oportunidades" icon="💡" count={oportunidades.length} defaultOpen={false}>
        {oportunidades.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Potencial de receita" icon="💰" count={comValor.length} defaultOpen={false}>
        {comValor.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Sem ação há 7+ dias" icon="⚠️" count={semAcao.length} defaultOpen={false}>
        {semAcao.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      <VisionSection title="Resolvidos recentes" icon="✅" count={concluidos.length} defaultOpen={false}>
        {concluidos.map(i => <ItemCard key={i.id} item={i} />)}
      </VisionSection>

      {items.length === 0 && pendingInbox.length === 0 && agendaEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Use o campo acima para capturar sua primeira ideia.</p>
        </div>
      )}
    </div>
  );
}
