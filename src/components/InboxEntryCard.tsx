import { Archive, ArrowRight, BookMarked, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';
import { InboxEntry } from '@/types/central';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InboxEntryCard({ entry }: { entry: InboxEntry }) {
  const { archiveInboxEntry, convertInboxToItem, convertInboxToMemory } = useCentral();

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      {entry.type === 'photo' && entry.photoUrl && (
        <img src={entry.photoUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
      )}
      <p className="text-sm text-foreground leading-relaxed">{entry.content}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Virar Item" onClick={() => convertInboxToItem(entry.id)}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Salvar como Memória" onClick={() => convertInboxToMemory(entry.id)}>
            <BookMarked className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Arquivar" onClick={() => archiveInboxEntry(entry.id)}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
