import { useCentral } from '@/contexts/CentralContext';
import QuickInput from '@/components/QuickInput';
import InboxEntryCard from '@/components/InboxEntryCard';
import ItemCard from '@/components/ItemCard';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

type Filter = 'pending' | 'all';

export default function InboxPage() {
  const { inbox, items } = useCentral();
  const [filter, setFilter] = useState<Filter>('pending');

  const capturas = useMemo(() => (
    filter === 'pending' ? inbox.filter(e => e.status === 'pending') : inbox
  ), [inbox, filter]);

  const inboxItems = useMemo(() => (
    items.filter(i => i.fase === 'Inbox')
  ), [items]);

  const total = capturas.length + (filter === 'pending' ? inboxItems.length : 0);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold text-foreground">Inbox</h1>
        <span className="text-xs text-muted-foreground">{total} a triar</span>
      </div>
      <QuickInput />

      <div className="flex gap-2">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {f === 'pending' ? 'Pendentes' : 'Todas as capturas'}
          </button>
        ))}
      </div>

      {capturas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Capturas a triar
          </p>
          {capturas.map(entry => (
            <InboxEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {filter === 'pending' && inboxItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Itens sem fase
          </p>
          {inboxItems.map(i => <ItemCard key={i.id} item={i} />)}
        </div>
      )}

      {total === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'pending' ? 'Nada para triar. Tudo limpo!' : 'Inbox vazio.'}
          </p>
        </div>
      )}
    </div>
  );
}
