import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { FinScope, formatBRL } from '@/types/finance';
import { CardStatement } from './CardStatement';
import { CardForm } from './CardsManager';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  cardId: string | null;
  scope: FinScope;
  companyId: string | null;
  onClose: () => void;
}

export function CardDetailSheet({ cardId, scope, companyId, onClose }: Props) {
  const { cards, accounts, deleteCard } = useFinance();
  const [editing, setEditing] = useState(false);
  const card = cards.find(c => c.id === cardId);

  const availableAccounts = accounts.filter(a => !a.archived && a.scope === scope &&
    (scope === 'pf' || a.companyId === companyId));

  return (
    <Sheet open={!!cardId} onOpenChange={o => { if (!o) { setEditing(false); onClose(); } }}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
        {card && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                   style={{ background: card.color + '22', color: card.color }}>
                {card.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-foreground truncate">{card.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {card.brand ? `${card.brand} · ` : ''}Fecha {card.closingDay || '—'} · Vence {card.dueDay || '—'} · Limite {formatBRL(card.limitAmount || 0)}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditing(v => !v)} title="Editar cartão">
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" title="Excluir cartão">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {card.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os lançamentos feitos nesse cartão continuam existindo, mas perdem a referência ao cartão.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => { await deleteCard(card.id); toast.success('Cartão excluído'); onClose(); }}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {editing && (
                <CardForm
                  mode={{ kind: 'edit', card }}
                  scope={scope}
                  companyId={companyId}
                  availableAccounts={availableAccounts}
                  onDone={() => setEditing(false)}
                />
              )}
              <CardStatement cardId={card.id} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
