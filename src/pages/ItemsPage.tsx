import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import ItemCard from '@/components/ItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isToday, isThisWeek, isThisMonth, isPast } from 'date-fns';
import { parseLocalDateTime } from '@/lib/dates';

type PeriodFilter = 'hoje' | 'semana' | 'mes' | 'vencidos';

export default function ItemsPage() {
  const { items, settings } = useCentral();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const visibleFases = settings.fases.filter(fase => fase !== 'Concluído');

  const matchesPeriod = (deadline?: string) => {
    if (!filterPeriod) return true;
    const d = parseLocalDateTime(deadline);
    if (!d) return false;
    if (filterPeriod === 'hoje') return isToday(d);
    if (filterPeriod === 'semana') return isThisWeek(d, { weekStartsOn: 1 });
    if (filterPeriod === 'mes') return isThisMonth(d);
    if (filterPeriod === 'vencidos') return isPast(d) && !isToday(d);
    return true;
  };

  const filtered = items.filter(i => {
    if (showArchived ? i.fase !== 'Concluído' : i.fase === 'Concluído') return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFase && i.fase !== filterFase) return false;
    if (filterArea && i.area !== filterArea) return false;
    if (filterTipo && i.tipo !== filterTipo) return false;
    if (!matchesPeriod(i.deadline)) return false;
    return true;
  });

  const FilterRow = ({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) => (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onChange(null)}
        className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', !value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
      >
        {label}
      </button>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(value === o ? null : o)}
          className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', value === o ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
        >
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Items</h1>
        <Button size="sm" onClick={() => navigate('/items/new')} className="rounded-full gap-1">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar items..." className="pl-9 h-9 rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <FilterRow label="Todos tipos" options={settings.tipos} value={filterTipo} onChange={setFilterTipo} />
        {!showArchived && <FilterRow label="Todas fases" options={visibleFases} value={filterFase} onChange={setFilterFase} />}
        <FilterRow label="Todas áreas" options={settings.areas} value={filterArea} onChange={setFilterArea} />
        <button
          onClick={() => {
            setShowArchived(prev => !prev);
            setFilterFase(null);
          }}
          className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors', showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
        >
          Arquivados
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(item => <ItemCard key={item.id} item={item} />)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
        </div>
      )}
    </div>
  );
}
