import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { FinScope, formatBRL } from '@/types/finance';
import { Repeat, Pause, Play, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Props { scope: FinScope; companyId: string | null; }

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual',
};

export function RecurrencesManager({ scope, companyId }: Props) {
  const { recurrences, accounts, categories, transactions, updateRecurrence, deleteRecurrence } = useFinance();

  const visible = useMemo(() => {
    return recurrences
      .filter(r => r.scope === scope)
      .filter(r => scope !== 'pj' || companyId === 'all' || r.companyId === companyId)
      .sort((a, b) => Number(b.active) - Number(a.active) || a.description.localeCompare(b.description));
  }, [recurrences, scope, companyId]);

  const futureCountFor = (recurrenceId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions.filter(t => t.recurrenceId === recurrenceId && t.occurredOn >= today).length;
  };

  if (visible.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground space-y-1">
        <Repeat className="h-6 w-6 mx-auto opacity-40" />
        <p>Nenhuma recorrência cadastrada ainda.</p>
        <p>Marque "Se repete todo mês" ao criar um lançamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map(r => {
        const acc = r.accountId ? accounts.find(a => a.id === r.accountId) : null;
        const cat = r.categoryId ? categories.find(c => c.id === r.categoryId) : null;
        const future = futureCountFor(r.id);
        return (
          <div
            key={r.id}
            className={`rounded-xl border p-3 space-y-2 ${r.active ? 'border-border bg-card' : 'border-dashed border-border bg-muted/30 opacity-70'}`}
          >
            <div className="flex items-start gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: r.kind === 'income' ? '#10b98122' : '#ef444422' }}
              >
                <Repeat className="h-3.5 w-3.5" style={{ color: r.kind === 'income' ? '#10b981' : '#ef4444' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate flex-1">{r.description}</span>
                  {!r.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Pausada</span>}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[
                    FREQ_LABEL[r.frequency],
                    r.frequency === 'monthly' && r.dayOfMonth ? `dia ${r.dayOfMonth}` : null,
                    cat?.name,
                    acc?.name,
                    r.endOn ? `até ${new Date(r.endOn + 'T00:00:00').toLocaleDateString('pt-BR')}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold" style={{ color: r.kind === 'income' ? 'hsl(var(--foreground))' : 'hsl(var(--destructive))' }}>
                  {r.kind === 'income' ? '+' : '−'}{formatBRL(r.amount).replace('R$', '').trim()}
                </div>
                {future > 0 && (
                  <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                    <Calendar className="h-2.5 w-2.5" /> {future} previstas
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm" variant="outline"
                onClick={() => {
                  updateRecurrence(r.id, { active: !r.active });
                  toast.success(r.active ? 'Pausada' : 'Reativada');
                }}
                className="h-7 rounded-lg text-xs"
              >
                {r.active ? <><Pause className="h-3 w-3 mr-1" /> Pausar</> : <><Play className="h-3 w-3 mr-1" /> Reativar</>}
              </Button>
              {r.active && !r.endOn && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    updateRecurrence(r.id, { endOn: today, active: false });
                    toast.success('Recorrência encerrada');
                  }}
                  className="h-7 rounded-lg text-xs"
                >
                  Encerrar hoje
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs text-destructive ml-auto">
                    <Trash2 className="h-3 w-3 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A regra <b>{r.description}</b> será removida.
                      {future > 0 && <> As <b>{future}</b> ocorrências futuras (a partir de hoje) também serão excluídas.</>}
                      {' '}Lançamentos passados (já registrados) <b>não</b> serão afetados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { deleteRecurrence(r.id, true); toast.success('Recorrência excluída'); }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir regra
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
