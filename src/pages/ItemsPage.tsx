import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import ItemCard from '@/components/ItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ItemsPage() {
  const { items, settings } = useCentral();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);

  const filtered = items.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFase && i.fase !== filterFase) return false;
    if (filterArea && i.area !== filterArea) return false;
    return true;
  });

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
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar items..."
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterFase(null)}
            className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', !filterFase ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
          >
            Todas fases
          </button>
          {settings.fases.map(f => (
            <button
              key={f}
              onClick={() => setFilterFase(filterFase === f ? null : f)}
              className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', filterFase === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterArea(null)}
            className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', !filterArea ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
          >
            Todas áreas
          </button>
          {settings.areas.map(a => (
            <button
              key={a}
              onClick={() => setFilterArea(filterArea === a ? null : a)}
              className={cn('text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors', filterArea === a ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >
              {a}
            </button>
          ))}
        </div>
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
