import { useCentral } from '@/contexts/CentralContext';
import InboxEntryCard from '@/components/InboxEntryCard';
import ItemCard from '@/components/ItemCard';
import InboxKanban from '@/components/inbox/InboxKanban';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Inbox as InboxIcon, LayoutList, Columns3 } from 'lucide-react';

type Filter = 'pending' | 'all';
type View = 'list' | 'kanban';

export default function InboxPage() {
  const { inbox, items } = useCentral();
  const [filter, setFilter] = useState<Filter>('pending');
  const [view, setView] = useState<View>('list');

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
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <span className="text-xs text-muted-foreground" data-mono>
          {view === 'kanban' ? `${items.length} itens` : `${total} a triar`}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-surface rounded-chip p-0.5">
          {([
            { id: 'list', label: 'Lista', icon: LayoutList },
            { id: 'kanban', label: 'Kanban', icon: Columns3 },
          ] as const).map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setView(opt.id)}
                className={cn(
                  'tap-target text-xs px-3 rounded-chip inline-flex items-center gap-1.5 transition-colors',
                  view === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>

        {view === 'list' && (
          <div className="flex gap-2">
            {(['pending', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'tap-target text-xs px-3 rounded-chip border transition-colors cursor-pointer',
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-muted-foreground border-surface-2 hover:text-foreground'
                )}
              >
                {f === 'pending' ? 'Pendentes' : 'Todas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'kanban' ? (
        <InboxKanban />
      ) : (
        <>
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
              <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                {filter === 'pending' ? 'Nada para triar' : 'Inbox vazio'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Toque no <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold align-middle">+</span> para capturar.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
