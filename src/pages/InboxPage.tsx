import { useCentral } from '@/contexts/CentralContext';
import InboxKanban from '@/components/inbox/InboxKanban';

export default function InboxPage() {
  const { items } = useCentral();

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <span className="text-xs text-muted-foreground" data-mono>
          {items.length} itens
        </span>
      </div>
      <InboxKanban />
    </div>
  );
}
