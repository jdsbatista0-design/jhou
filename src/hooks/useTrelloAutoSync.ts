import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const TRELLO_REALTIME_KEY = 'trello_realtime_sync';

export function isTrelloRealtimeEnabled() {
  try {
    return localStorage.getItem(TRELLO_REALTIME_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setTrelloRealtimeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(TRELLO_REALTIME_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const PULL_INTERVAL_MS = 45_000;
const PUSH_DEBOUNCE_MS = 6_000;

/**
 * Sincronização contínua com o Trello:
 * - empurra mudanças locais (debounce) via Postgres Changes em `items`
 * - puxa mudanças do Trello a cada 45s enquanto a aba está visível
 */
export function useTrelloAutoSync() {
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const sync = async () => {
      if (cancelled || running.current || document.hidden) return;
      if (!isTrelloRealtimeEnabled()) return;
      running.current = true;
      try {
        await supabase.functions.invoke('trello-sync', { body: { action: 'sync' } });
      } catch {
        /* silencioso: sync em background */
      } finally {
        running.current = false;
      }
    };

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(sync, PUSH_DEBOUNCE_MS);
    };

    const start = async () => {
      if (!isTrelloRealtimeEnabled()) return;
      let connected = false;
      try {
        const { data } = await supabase.functions.invoke('trello-sync', { body: { action: 'status' } });
        connected = !!(data as any)?.connected;
      } catch {
        return;
      }
      if (!connected || cancelled) return;

      void sync();

      channel = supabase
        .channel('trello-autosync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, schedule)
        .subscribe();

      interval = setInterval(sync, PULL_INTERVAL_MS);
      document.addEventListener('visibilitychange', onVisible);
    };

    const onVisible = () => {
      if (!document.hidden) void sync();
    };

    // não competir com o boot da UI
    const boot = setTimeout(() => void start(), 4000);

    return () => {
      cancelled = true;
      clearTimeout(boot);
      if (timer.current) clearTimeout(timer.current);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
