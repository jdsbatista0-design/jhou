import { useCentral } from '@/contexts/CentralContext';
import QuickInput from '@/components/QuickInput';
import InboxEntryCard from '@/components/InboxEntryCard';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function InboxPage() {
  const { inbox } = useCentral();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const filtered = filter === 'pending'
    ? inbox.filter(e => e.status === 'pending')
    : inbox;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-foreground">Inbox</h1>
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
            {f === 'pending' ? 'Pendentes' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(entry => (
          <InboxEntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'pending' ? 'Nenhuma entrada pendente.' : 'Inbox vazio.'}
          </p>
        </div>
      )}
    </div>
  );
}
