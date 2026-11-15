import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CaptureAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} aria-label={`Novo${label === 'Rotina' ? 'a' : ''} ${label.toLowerCase()}`}
      className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 h-14 rounded-full px-6 shadow-panel font-semibold">
      <Plus className="h-5 w-5" />{label}
    </Button>
  );
}