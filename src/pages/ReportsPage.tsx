import { useCentral } from '@/contexts/CentralContext';
import { differenceInDays, isThisWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VisionSection from '@/components/VisionSection';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { parseLocalDateTime } from '@/lib/dates';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ReportItem({ title, sub, onClick, urgent }: { title: string; sub: string; onClick?: () => void; urgent?: boolean }) {
  return (
    <div
      className={`bg-card border rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-colors ${urgent ? 'border-destructive/30' : 'border-border'}`}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { items } = useCentral();
  const navigate = useNavigate();
  const now = new Date();
  const deadlineDate = (value?: string) => parseLocalDateTime(value);

  const active = items.filter(i => i.fase !== 'Concluído');
  const done = items.filter(i => i.fase === 'Concluído');
  const doneThisWeek = done.filter(i => isThisWeek(new Date(i.updatedAt), { weekStartsOn: 1 }));
  const doneRecent = done.filter(i => differenceInDays(now, new Date(i.updatedAt)) <= 7);

  // === ONDE DEVO AGIR AGORA ===
  const urgentes = active.filter(i => i.tags.includes('urgente'));
  const travados = active.filter(i => i.fase === 'Travado');
  const overdue = active.filter(i => {
    const date = deadlineDate(i.deadline);
    return date ? date < now : false;
  });
  const aguardandoLongo = active
    .filter(i => i.fase === 'Aguardando')
    .map(i => ({ ...i, days: differenceInDays(now, new Date(i.updatedAt)) }))
    .sort((a, b) => b.days - a.days);
  const semAcao = active.filter(i => differenceInDays(now, new Date(i.updatedAt)) >= 7);

  // === ONDE ESTÁ O DINHEIRO ===
  const oportunidades = active.filter(i => i.tipo === 'Oportunidade');
  const comValor = active.filter(i => i.value && i.value > 0);
  const totalRevenue = comValor.reduce((s, i) => s + (i.value || 0), 0);
  const oppsSemAndamento = oportunidades.filter(i => ['Inbox', 'Aguardando'].includes(i.fase));
  const byAreaRevenue: Record<string, number> = {};
  comValor.forEach(i => { byAreaRevenue[i.area] = (byAreaRevenue[i.area] || 0) + (i.value || 0); });

  // === ONDE ESTOU CARREGADO ===
  const byArea: Record<string, number> = {};
  active.forEach(i => { byArea[i.area] = (byArea[i.area] || 0) + 1; });
  const sortedAreas = Object.entries(byArea).sort((a, b) => b[1] - a[1]);

  const byFase: Record<string, number> = {};
  active.forEach(i => { byFase[i.fase] = (byFase[i.fase] || 0) + 1; });

  const byPriority: Record<string, number> = {};
  active.forEach(i => { const p = i.priority || 'sem'; byPriority[p] = (byPriority[p] || 0) + 1; });

  // === MORRENDO SEM ATENÇÃO ===
  const pessoasSemRetorno: Record<string, { days: number; count: number }> = {};
  active.filter(i => i.person).forEach(i => {
    const days = differenceInDays(now, new Date(i.updatedAt));
    if (!pessoasSemRetorno[i.person!] || pessoasSemRetorno[i.person!].days < days) {
      pessoasSemRetorno[i.person!] = { days, count: (pessoasSemRetorno[i.person!]?.count || 0) + 1 };
    }
  });
  const stalePeople = Object.entries(pessoasSemRetorno)
    .filter(([, v]) => v.days >= 5)
    .sort((a, b) => b[1].days - a[1].days);

  const pendenciasVelhas = active
    .filter(i => i.tags.includes('aguardando retorno') && differenceInDays(now, new Date(i.updatedAt)) >= 5)
    .sort((a, b) => differenceInDays(now, new Date(a.updatedAt)) - differenceInDays(now, new Date(b.updatedAt)));

  // === NOTAS CONCLUÍDAS ===
  const notasConcluidas = done.filter(i => i.tipo === 'Nota');

  const actionCount = urgentes.length + travados.length + overdue.length;

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl font-bold text-foreground">📊 Painel Executivo</h1>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Ativos" value={active.length} accent />
        <StatCard label="Ação urgente" value={actionCount} sub={actionCount > 0 ? 'Requer atenção' : 'Tudo ok'} accent={actionCount > 0} />
        <StatCard label="Concluídos semana" value={doneThisWeek.length} />
        <StatCard label="Potencial R$" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </div>

      {/* ONDE DEVO AGIR */}
      <VisionSection title="Onde devo agir agora" icon="🔥" count={urgentes.length + travados.length + overdue.length} defaultOpen={true}>
        {urgentes.map(i => (
          <ReportItem key={i.id} title={i.title} sub={`🔴 Urgente · ${i.area}`} urgent onClick={() => navigate(`/items/${i.id}`)} />
        ))}
        {travados.map(i => (
          <ReportItem key={i.id} title={i.title} sub={`🚫 Travado · ${i.area} · ${differenceInDays(now, new Date(i.updatedAt))}d`} urgent onClick={() => navigate(`/items/${i.id}`)} />
        ))}
        {overdue.map(i => (
          <ReportItem key={i.id} title={i.title} sub={`⚠️ Vencido · ${i.area} · ${format(deadlineDate(i.deadline) || new Date(i.deadline!), 'dd/MM', { locale: ptBR })}`} urgent onClick={() => navigate(`/items/${i.id}`)} />
        ))}
      </VisionSection>

      {aguardandoLongo.length > 0 && (
        <VisionSection title="Aguardando há tempo" icon="⏳" count={aguardandoLongo.length}>
          {aguardandoLongo.slice(0, 8).map(i => (
            <ReportItem key={i.id} title={i.title} sub={`${i.area} · ${i.days} dias${i.person ? ` · 👤 ${i.person}` : ''}`} onClick={() => navigate(`/items/${i.id}`)} />
          ))}
        </VisionSection>
      )}

      {/* ONDE ESTÁ O DINHEIRO */}
      <VisionSection title="Onde está o dinheiro" icon="💰" count={comValor.length}>
        {Object.entries(byAreaRevenue).sort((a, b) => b[1] - a[1]).map(([area, val]) => (
          <div key={area} className="bg-card border border-border rounded-xl p-3 flex justify-between">
            <span className="text-sm text-foreground">{area}</span>
            <span className="text-sm font-bold text-foreground">{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        ))}
        {oppsSemAndamento.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
            <p className="text-[11px] text-destructive font-medium">⚠ {oppsSemAndamento.length} oportunidade(s) sem andamento</p>
            {oppsSemAndamento.map(i => (
              <p key={i.id} className="text-xs text-muted-foreground cursor-pointer hover:text-foreground mt-1" onClick={() => navigate(`/items/${i.id}`)}>
                · {i.title}
              </p>
            ))}
          </div>
        )}
      </VisionSection>

      {/* ONDE ESTOU CARREGADO */}
      <VisionSection title="Onde estou carregado" icon="📊" count={sortedAreas.length} defaultOpen={false}>
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Por área</p>
          {sortedAreas.map(([area, count]) => (
            <div key={area} className="flex items-center gap-2">
              <span className="text-xs text-foreground w-24 truncate">{area}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(count / Math.max(...Object.values(byArea))) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 mt-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Por fase</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byFase).map(([fase, count]) => (
              <Badge key={fase} variant="outline" className="text-[10px]">{fase}: {count}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1 mt-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Por prioridade</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byPriority).map(([p, count]) => (
              <Badge key={p} variant="outline" className="text-[10px]">{p === 'sem' ? 'Sem prioridade' : p}: {count}</Badge>
            ))}
          </div>
        </div>
      </VisionSection>

      {/* MORRENDO SEM ATENÇÃO */}
      <VisionSection title="Morrendo sem atenção" icon="⚠️" count={semAcao.length + stalePeople.length}>
        {semAcao.slice(0, 8).map(i => (
          <ReportItem key={i.id} title={i.title} sub={`${i.area} · ${differenceInDays(now, new Date(i.updatedAt))}d sem ação`} onClick={() => navigate(`/items/${i.id}`)} />
        ))}
        {stalePeople.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">👤 Pessoas sem retorno</p>
            {stalePeople.map(([name, { days }]) => (
              <p key={name} className="text-xs text-foreground">· {name} — <span className="text-destructive">{days}d</span></p>
            ))}
          </div>
        )}
        {pendenciasVelhas.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">📌 Follow-ups pendentes</p>
            {pendenciasVelhas.slice(0, 5).map(i => (
              <p key={i.id} className="text-xs text-foreground cursor-pointer hover:text-primary" onClick={() => navigate(`/items/${i.id}`)}>
                · {i.title} — {differenceInDays(now, new Date(i.updatedAt))}d
              </p>
            ))}
          </div>
        )}
      </VisionSection>

      {/* O QUE RESOLVI */}
      <VisionSection title="O que resolvi" icon="✅" count={doneRecent.length} defaultOpen={false}>
        {doneRecent.map(i => (
          <ReportItem key={i.id} title={i.title} sub={`${i.area} · ${i.tipo} · ${format(new Date(i.updatedAt), 'dd/MM', { locale: ptBR })}`} onClick={() => navigate(`/items/${i.id}`)} />
        ))}
        {notasConcluidas.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">📝 Notas concluídas</p>
            {notasConcluidas.slice(0, 5).map(i => (
              <p key={i.id} className="text-xs text-foreground">· {i.title}</p>
            ))}
          </div>
        )}
      </VisionSection>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Adicione items para ver relatórios.</p>
        </div>
      )}
    </div>
  );
}
