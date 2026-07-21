import { useState, useMemo } from 'react';
import { useCentral } from '@/contexts/CentralContext';
import InboxKanban from '@/components/inbox/InboxKanban';
import InboxList from '@/components/inbox/InboxList';
import InboxEntryCard from '@/components/InboxEntryCard';
import { cn } from '@/lib/utils';
import { List, LayoutGrid, Inbox as InboxIcon } from 'lucide-react';

export default function InboxPage() {
  const { items, inbox } = useCentral();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCapturas, setShowCapturas] = useState(true);

  const capturas = useMemo(() => inbox.filter(e => e.status === 'pending'), [inbox]);

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" data-mono>{items.length}</span>
          <div className="flex gap-0.5 bg-surface rounded-chip p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'tap-target px-2.5 rounded-chip transition-colors flex items-center gap-1 text-xs',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
              aria-label="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'tap-target px-2.5 rounded-chip transition-colors flex items-center gap-1 text-xs',
                view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
              aria-label="Kanban"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {capturas.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2 space-y-1.5">
          <button
            onClick={() => setShowCapturas(v => !v)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-primary uppercase tracking-wide"
          >
            <span className="inline-flex items-center gap-1.5">
              <InboxIcon className="h-3 w-3" /> {capturas.length} captura{capturas.length > 1 ? 's' : ''} a triar
            </span>
            <span>{showCapturas ? '−' : '+'}</span>
          </button>
          {showCapturas && (
            <div className="space-y-1.5">
              {capturas.map(entry => (
                <InboxEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'list' ? <InboxList /> : <InboxKanban />}
    </div>
  );
}
