import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { items } = useCentral();
  const navigate = useNavigate();
  const now = new Date();
  const active = items.filter(i => i.fase !== 'Concluído');

  // Carga por área
  const byArea: Record<string, number> = {};
  active.forEach(i => { byArea[i.area] = (byArea[i.area] || 0) + 1; });
  const sortedAreas = Object.entries(byArea).sort((a, b) => b[1] - a[1]);

  // Oportunidades quentes
  const hotOpps = items.filter(i => i.tipo === 'Oportunidade' && !['Concluído', 'Capturado'].includes(i.fase));

  // Aguardando há mais tempo
  const waiting = items.filter(i => i.fase === 'Aguardando')
    .map(i => ({ ...i, days: differenceInDays(now, new Date(i.updatedAt)) }))
    .sort((a, b) => b.days - a.days);

  // Sem ação
  const stale = active.filter(i => differenceInDays(now, new Date(i.updatedAt)) >= 7);

  // Potencial de receita
  const revenueItems = active.filter(i => i.value && i.value > 0);
  const totalRevenue = revenueItems.reduce((sum, i) => sum + (i.value || 0), 0);

  // Pessoas sem follow-up
  const personItems = active.filter(i => i.person);
  const personMap: Record<string, number> = {};
  personItems.forEach(i => {
    const days = differenceInDays(now, new Date(i.updatedAt));
    if (!personMap[i.person!] || personMap[i.person!] < days) personMap[i.person!] = days;
  });
  const stalePersons = Object.entries(personMap).filter(([, d]) => d >= 5).sort((a, b) => b[1] - a[1]);

  // Concluídos
  const done = items.filter(i => i.fase === 'Concluído');

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Relatórios e Direção</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total ativo" value={active.length} />
        <StatCard label="Concluídos" value={done.length} />
        <StatCard label="Travados" value={items.filter(i => i.fase === 'Travado').length} />
        <StatCard label="Potencial R$" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </div>

      {sortedAreas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">📊 Carga por área</h2>
          {sortedAreas.map(([area, count]) => (
            <div key={area} className="flex items-center gap-2">
              <span className="text-xs text-foreground flex-1">{area}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-primary rounded-full h-2" style={{ width: `${(count / Math.max(...Object.values(byArea))) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}

      {hotOpps.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">🔥 Oportunidades quentes</h2>
          {hotOpps.map(i => (
            <div key={i.id} className="bg-card border border-border rounded-xl p-3">
              <p className="text-sm font-medium text-foreground">{i.title}</p>
              <p className="text-[11px] text-muted-foreground">{i.area} · {i.fase}{i.value ? ` · R$ ${i.value.toLocaleString('pt-BR')}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">⏳ Aguardando há mais tempo</h2>
          {waiting.slice(0, 10).map(i => (
            <div key={i.id} className="bg-card border border-border rounded-xl p-3 flex justify-between">
              <p className="text-sm text-foreground">{i.title}</p>
              <span className="text-xs text-muted-foreground">{i.days}d</span>
            </div>
          ))}
        </div>
      )}

      {stalePersons.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">👤 Pessoas sem follow-up</h2>
          {stalePersons.map(([name, days]) => (
            <div key={name} className="bg-card border border-border rounded-xl p-3 flex justify-between">
              <p className="text-sm text-foreground">{name}</p>
              <span className="text-xs text-destructive">{days} dias</span>
            </div>
          ))}
        </div>
      )}

      {stale.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">⚠️ Sem ação há 7+ dias ({stale.length})</h2>
          {stale.slice(0, 10).map(i => (
            <div key={i.id} className="bg-card border border-border rounded-xl p-3">
              <p className="text-sm text-foreground">{i.title}</p>
              <p className="text-[11px] text-muted-foreground">{i.area} · {differenceInDays(now, new Date(i.updatedAt))} dias</p>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Adicione items para ver relatórios.</p>
        </div>
      )}
    </div>
  );
}
