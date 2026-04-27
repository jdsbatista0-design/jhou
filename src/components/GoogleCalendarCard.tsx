import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';

interface GcalState {
  calendar_id: string | null;
  last_pull_at: string | null;
  last_push_at: string | null;
}

export function GoogleCalendarCard() {
  const [state, setState] = useState<GcalState | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from('gcal_state' as any)
      .select('calendar_id, last_pull_at, last_push_at')
      .maybeSingle();
    setState((data as any) || { calendar_id: null, last_pull_at: null, last_push_at: null });
  };

  useEffect(() => {
    refresh();
  }, []);

  const callSync = async (action: 'init' | 'sync') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gcal-sync', {
        body: { action },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (action === 'init') toast.success('Agenda "Central" pronta no Google ✅');
      else {
        const r = data as any;
        toast.success(
          `Sincronizado · ${r?.pull?.processed ?? 0} do Google, ${r?.pushed ?? 0} para o Google`,
        );
      }
      await refresh();
    } catch (e: any) {
      console.error('gcal-sync error', e);
      toast.error('Falha: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const connected = !!state?.calendar_id;
  const lastSync = state?.last_pull_at || state?.last_push_at;

  return (
    <div className="border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Google Agenda</p>
          <p className="text-[10px] text-muted-foreground">
            {connected ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                Agenda "Central" conectada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                Não conectado
              </span>
            )}
          </p>
        </div>
        {!connected ? (
          <Button
            size="sm"
            className="rounded-xl h-8"
            onClick={() => callSync('init')}
            disabled={loading}
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Conectar'}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-8 gap-1"
            onClick={() => callSync('sync')}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="text-xs">Sincronizar</span>
          </Button>
        )}
      </div>
      {connected && (
        <p className="text-[10px] text-muted-foreground">
          {lastSync
            ? `Última sync: ${format(new Date(lastSync), "dd/MM HH:mm", { locale: ptBR })}`
            : 'Aguardando primeira sincronização'}
          {' · '}Items com data viram eventos automaticamente
        </p>
      )}
    </div>
  );
}
