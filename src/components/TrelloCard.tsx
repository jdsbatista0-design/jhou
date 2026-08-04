import { useEffect, useState } from 'react';
import { RefreshCw, Trello, ExternalLink, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { isTrelloRealtimeEnabled, setTrelloRealtimeEnabled } from '@/hooks/useTrelloAutoSync';

type Config = {
  board_id: string;
  board_url: string | null;
  last_sync_at: string | null;
};

export function TrelloCard() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [realtime, setRealtime] = useState(isTrelloRealtimeEnabled());

  const call = async (action: string) => {
    const { data, error } = await supabase.functions.invoke('trello-sync', { body: { action } });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await call('status');
        setConfig(res.config ?? null);
      } catch {
        /* silencioso no boot */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const res = await call('connect');
      setConfig(res.config);
      toast.success('Board conectado — enviando seus itens…');
      const s = await call('sync');
      setConfig(c => (c ? { ...c, last_sync_at: new Date().toISOString() } : c));
      toast.success(`${s.created_in_trello} itens enviados para o Trello`);
    } catch (e: any) {
      toast.error('Erro ao conectar: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      const res = await call('sync');
      setConfig(c => (c ? { ...c, last_sync_at: new Date().toISOString() } : c));
      toast.success(
        `Sincronizado · ${res.created_in_trello} novos no Trello · ${res.created_in_central} novos no Inbox · ${res.pushed + res.pulled} atualizados`,
      );
    } catch (e: any) {
      toast.error('Erro ao sincronizar: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await call('disconnect');
      setConfig(null);
      toast.success('Trello desconectado');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Trello className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Trello</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {loading
              ? 'Verificando…'
              : config
                ? config.last_sync_at
                  ? `Última sincronização: ${new Date(config.last_sync_at).toLocaleString('pt-BR')}`
                  : 'Conectado — sincronize para enviar seus itens'
                : 'Sincronize o Inbox com um board do Trello (mão dupla)'}
          </p>
        </div>
        {config?.board_url && (
          <a
            href={config.board_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Abrir board no Trello"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="flex gap-2">
        {config ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-8 gap-1 flex-1"
              onClick={handleSync}
              disabled={busy}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
              <span className="text-xs">Sincronizar agora</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl h-8 px-2 text-muted-foreground"
              onClick={handleDisconnect}
              disabled={busy}
              aria-label="Desconectar Trello"
            >
              <Unplug className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-8 gap-1 w-full"
            onClick={handleConnect}
            disabled={busy || loading}
          >
            <Trello className="h-3.5 w-3.5" />
            <span className="text-xs">Conectar board</span>
          </Button>
        )}
      </div>

      {config && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[10px] text-muted-foreground leading-snug flex-1">
            Sincronização em tempo real (envia mudanças na hora e busca o Trello a cada 45s)
          </p>
          <Switch
            checked={realtime}
            onCheckedChange={(v) => {
              setRealtime(v);
              setTrelloRealtimeEnabled(v);
              toast.success(v ? 'Sincronização em tempo real ativada' : 'Sincronização automática desativada');
            }}
          />
        </div>
      )}

      {config && (
        <p className="text-[10px] text-muted-foreground leading-snug">
          As listas do board seguem as fases (Inbox, Em andamento, Aguardando, Travado, Concluído). Ao concluir, o card é arquivado no Trello. Rotinas não são sincronizadas.
        </p>
      )}
    </div>
  );
}
