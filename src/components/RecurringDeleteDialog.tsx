import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DeleteScope = 'one' | 'future' | 'all';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  isRecurring: boolean;
  onConfirm: (scope: DeleteScope) => void | Promise<void>;
}

export function RecurringDeleteDialog({ open, onOpenChange, title, isRecurring, onConfirm }: Props) {
  const [scope, setScope] = useState<DeleteScope>('one');

  const handle = async () => {
    await onConfirm(isRecurring ? scope : 'one');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir "{title}"?</DialogTitle>
          <DialogDescription>
            {isRecurring
              ? 'Este item faz parte de uma série. Escolha o que apagar:'
              : 'Esta ação não pode ser desfeita.'}
          </DialogDescription>
        </DialogHeader>

        {isRecurring && (
          <div className="space-y-2 py-2">
            {([
              { id: 'one', label: 'Só este', desc: 'Apenas esta ocorrência' },
              { id: 'future', label: 'Este e os próximos', desc: 'Encerra a série a partir daqui' },
              { id: 'all', label: 'Toda a série', desc: 'Remove a recorrência e todos os futuros' },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => setScope(opt.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border transition-colors',
                  scope === opt.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <div className="text-sm font-medium text-foreground">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" className="h-11" onClick={handle}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
