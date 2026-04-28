import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Repeat, Bell, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { weekdaysSummary } from '@/lib/recurrence';
import { toast } from 'sonner';

export function RecurrencesManager() {
  const { recurrences, updateRecurrence, deleteRecurrence } = useCentral();

  if (recurrences.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-4 text-center">
        <Repeat className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          Nenhum compromisso recorrente. Crie em Agenda → Compromisso → "Repete".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Repeat className="h-4 w-4" /> Recorrências
      </h3>
      {recurrences.map(rec => (
        <div key={rec.id} className="border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{rec.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {weekdaysSummary(rec.weekdays)} · {rec.time}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="secondary" className="text-[9px]">{rec.area}</Badge>
                <Badge variant="outline" className="text-[9px]">{rec.type}</Badge>
                <Badge variant="outline" className="text-[9px] gap-0.5">
                  <Bell className="h-2.5 w-2.5" />{rec.reminderMinutes}min
                </Badge>
                {!rec.active && <Badge variant="outline" className="text-[9px]">pausada</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={rec.active}
                onCheckedChange={async v => {
                  await updateRecurrence(rec.id, { active: v });
                  toast.success(v ? 'Recorrência ativada' : 'Recorrência pausada');
                }}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir "{rec.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A regra será removida. Ocorrências futuras não-concluídas também serão apagadas.
                      Histórico (concluídas e passadas) é preservado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteRecurrence(rec.id, true);
                        toast.success('Recorrência removida');
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
