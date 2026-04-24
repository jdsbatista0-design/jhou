import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { InboxEntry, Item, ItemComment, Memory, AgendaEvent, Settings, DEFAULT_SETTINGS } from '@/types/central';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDateTime } from '@/lib/dates';
import { encryptString, decryptString } from '@/lib/crypto';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    if (key === 'central_settings') {
      return {
        ...fallback,
        ...parsed,
        tipos: (fallback as any).tipos,
        fases: (fallback as any).fases,
        tagGroups: (fallback as any).tagGroups,
      } as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function normalizeSettings(value: unknown): Settings {
  const parsed = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    tipos: Array.isArray(parsed.tipos) ? parsed.tipos : DEFAULT_SETTINGS.tipos,
    fases: Array.isArray(parsed.fases) ? parsed.fases : DEFAULT_SETTINGS.fases,
    areas: Array.isArray(parsed.areas) ? parsed.areas : DEFAULT_SETTINGS.areas,
    tagGroups: Array.isArray(parsed.tagGroups) ? parsed.tagGroups : DEFAULT_SETTINGS.tagGroups,
    agendaTypes: Array.isArray(parsed.agendaTypes) ? parsed.agendaTypes : DEFAULT_SETTINGS.agendaTypes,
  };
}

interface CentralContextType {
  inbox: InboxEntry[];
  addInboxEntry: (content: string, type: InboxEntry['type'], photoUrl?: string, audioUrl?: string) => void;
  archiveInboxEntry: (id: string) => void;
  deleteInboxEntry: (id: string) => void;
  convertInboxToItem: (id: string, title?: string) => void;
  convertInboxToMemory: (id: string, title?: string) => void;
  refreshInbox: () => Promise<void>;
  items: Item[];
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'linkedAgendaIds' | 'comments'> & Partial<Pick<Item, 'tags' | 'linkedAgendaIds' | 'comments'>>) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  addComment: (itemId: string, text: string) => void;
  deleteComment: (itemId: string, commentId: string) => void;
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => void;
  deleteMemory: (id: string) => void;
  events: AgendaEvent[];
  addEvent: (event: Omit<AgendaEvent, 'id' | 'createdAt'>) => void;
  deleteEvent: (id: string) => void;
  agendaEntries: AgendaEntry[];
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

export interface AgendaEntry {
  id: string;
  title: string;
  datetime: string;
  type: string;
  source: 'item' | 'event';
  sourceId: string;
  item?: Item;
}

const CentralContext = createContext<CentralContextType | null>(null);

// Helper to map DB row to InboxEntry
function dbRowToInboxEntry(row: any): InboxEntry {
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    photoUrl: row.photo_url || undefined,
    audioUrl: row.audio_url || undefined,
    status: row.status,
    source: row.source || 'app',
    whatsappFrom: row.whatsapp_from || undefined,
    createdAt: row.created_at,
  };
}

function dbRowToItem(row: any, comments: ItemComment[]): Item {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    photoUrl: row.photo_url || undefined,
    tipo: row.tipo,
    fase: row.fase,
    area: row.area,
    priority: row.priority || undefined,
    deadline: row.deadline || undefined,
    deadlineTime: row.deadline_time || undefined,
    person: row.person || undefined,
    asset: row.asset || undefined,
    value: row.value != null ? Number(row.value) : undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    linkedAgendaIds: Array.isArray(row.linked_agenda_ids) ? row.linked_agenda_ids : [],
    comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function dbRowToMemory(row: any): Promise<Memory> {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    category: row.category || 'geral',
    area: row.area || undefined,
    login: (await decryptString(row.login)) || undefined,
    password: (await decryptString(row.password)) || undefined,
    url: (await decryptString(row.url)) || undefined,
    city: row.city || undefined,
    createdAt: row.created_at,
  };
}

function dbRowToEvent(row: any): AgendaEvent {
  return {
    id: row.id,
    title: row.title,
    datetime: row.datetime,
    duration: row.duration || undefined,
    type: row.type,
    linkedItemId: row.linked_item_id || undefined,
    createdAt: row.created_at,
  };
}

export function CentralProvider({ children }: { children: React.ReactNode }) {
  const [inbox, setInbox] = useState<InboxEntry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage('central_settings', DEFAULT_SETTINGS));

  // ---- INBOX (already DB-backed) ----
  const refreshInbox = useCallback(async () => {
    const { data, error } = await supabase
      .from('inbox_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setInbox(data.map(dbRowToInboxEntry));
    }
  }, []);

  // ---- ITEMS ----
  const refreshItems = useCallback(async () => {
    const { data: itemRows, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !itemRows) return;

    const { data: commentRows } = await supabase
      .from('item_comments')
      .select('*')
      .order('created_at', { ascending: true });

    const commentsByItem: Record<string, ItemComment[]> = {};
    (commentRows || []).forEach((c: any) => {
      if (!commentsByItem[c.item_id]) commentsByItem[c.item_id] = [];
      commentsByItem[c.item_id].push({ id: c.id, text: c.text, createdAt: c.created_at });
    });

    setItems(itemRows.map((r: any) => dbRowToItem(r, commentsByItem[r.id] || [])));
  }, []);

  // ---- MEMORIES ----
  const refreshMemories = useCallback(async () => {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = await Promise.all(data.map(dbRowToMemory));
      setMemories(mapped);
    }
  }, []);

  // ---- EVENTS ----
  const refreshEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('datetime', { ascending: true });
    if (!error && data) {
      setEvents(data.map(dbRowToEvent));
    }
  }, []);

  const getUserId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }, []);

  const refreshSettings = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { data, error } = await (supabase as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'central_settings')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data?.value) {
      setSettings(normalizeSettings(data.value));
    }
  }, [getUserId]);

  // Initial load + realtime
  useEffect(() => {
    refreshInbox();
    refreshItems();
    refreshMemories();
    refreshEvents();
    refreshSettings();

    const inboxCh = supabase.channel('inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_entries' }, () => refreshInbox())
      .subscribe();

    const itemsCh = supabase.channel('items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => refreshItems())
      .subscribe();

    const commentsCh = supabase.channel('comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_comments' }, () => refreshItems())
      .subscribe();

    const memoriesCh = supabase.channel('memories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, () => refreshMemories())
      .subscribe();

    const eventsCh = supabase.channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refreshEvents())
      .subscribe();

    const settingsCh = supabase.channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => refreshSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(inboxCh);
      supabase.removeChannel(itemsCh);
      supabase.removeChannel(commentsCh);
      supabase.removeChannel(memoriesCh);
      supabase.removeChannel(eventsCh);
      supabase.removeChannel(settingsCh);
    };
  }, [refreshInbox, refreshItems, refreshMemories, refreshEvents, refreshSettings]);

  // Auto-pull do Google Calendar a cada 2 minutos quando a aba está visível
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const { data: state } = await (supabase as any)
          .from('gcal_state')
          .select('calendar_id')
          .maybeSingle();
        if (!state?.calendar_id) return;
        await supabase.functions.invoke('gcal-sync', { body: { action: 'pull' } });
      } catch (e) {
        console.warn('gcal pull periódico falhou', e);
      }
    };
    const initial = window.setTimeout(tick, 5000);
    const timer = window.setInterval(tick, 120_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  // Settings still localStorage (personal preferences)
  useEffect(() => saveToStorage('central_settings', settings), [settings]);

  const agendaEntries = useMemo<AgendaEntry[]>(() => {
    const fromItems: AgendaEntry[] = items
      .filter(i => i.deadline && i.fase !== 'Concluído')
      .map(i => ({
        id: `item-${i.id}`,
        title: i.title,
        datetime: i.deadlineTime
          ? `${i.deadline!.split('T')[0]}T${i.deadlineTime}`
          : i.deadline!,
        type: i.tipo,
        source: 'item' as const,
        sourceId: i.id,
        item: i,
      }));

    const fromEvents: AgendaEntry[] = events.map(e => ({
      id: `event-${e.id}`,
      title: e.title,
      datetime: e.datetime,
      type: e.type,
      source: 'event' as const,
      sourceId: e.id,
    }));

    return [...fromItems, ...fromEvents].sort((a, b) => {
      const aDate = parseLocalDateTime(a.datetime) || new Date(a.datetime);
      const bDate = parseLocalDateTime(b.datetime) || new Date(b.datetime);
      return aDate.getTime() - bDate.getTime();
    });
  }, [items, events]);

  // ---- INBOX ACTIONS ----
  const addInboxEntry = useCallback(async (content: string, type: InboxEntry['type'], photoUrl?: string, audioUrl?: string) => {
    const userId = await getUserId();
    if (!userId) return;
    const entry: any = { content, type, status: 'pending', source: 'app', user_id: userId };
    if (photoUrl) entry.photo_url = photoUrl;
    if (audioUrl) entry.audio_url = audioUrl;
    await supabase.from('inbox_entries').insert(entry);
  }, [getUserId]);

  const archiveInboxEntry = useCallback(async (id: string) => {
    await supabase.from('inbox_entries').update({ status: 'archived' }).eq('id', id);
  }, []);

  const deleteInboxEntry = useCallback(async (id: string) => {
    await supabase.from('inbox_entries').delete().eq('id', id);
  }, []);

  // ---- CONVERT INBOX ----
  const convertInboxToItem = useCallback(async (id: string, title?: string) => {
    const entry = inbox.find(e => e.id === id);
    if (!entry) return;
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from('items').insert({
      title: title || entry.content.slice(0, 100),
      description: entry.content,
      photo_url: entry.photoUrl || null,
      tipo: 'Inbox',
      fase: 'Inbox',
      area: settings.areas[0],
      user_id: userId,
    });
    if (!error) {
      await supabase.from('inbox_entries').update({ status: 'processed' }).eq('id', id);
    }
  }, [inbox, settings, getUserId]);

  const convertInboxToMemory = useCallback(async (id: string, title?: string) => {
    const entry = inbox.find(e => e.id === id);
    if (!entry) return;
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from('memories').insert({
      title: title || entry.content.slice(0, 100),
      content: entry.content,
      category: 'geral',
      user_id: userId,
    });
    if (!error) {
      await supabase.from('inbox_entries').update({ status: 'processed' }).eq('id', id);
    }
  }, [inbox, getUserId]);

  // ---- GOOGLE CALENDAR PUSH ----
  const pushToGoogle = useCallback(async (itemId: string, op: 'upsert' | 'delete') => {
    try {
      // Só dispara se a agenda já foi conectada (gcal_state existe)
      const { data: state } = await (supabase as any)
        .from('gcal_state')
        .select('calendar_id')
        .maybeSingle();
      if (!state?.calendar_id) return;
      await supabase.functions.invoke('gcal-sync', {
        body: { action: 'push', itemId, op },
      });
    } catch (e) {
      console.warn('gcal push falhou (não-crítico)', e);
    }
  }, []);

  // ---- ITEM ACTIONS ----
  const addItem = useCallback(async (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'linkedAgendaIds' | 'comments'> & Partial<Pick<Item, 'tags' | 'linkedAgendaIds' | 'comments'>>) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data, error } = await supabase.from('items').insert({
      title: item.title,
      description: item.description || null,
      photo_url: item.photoUrl || null,
      tipo: item.tipo,
      fase: item.fase,
      area: item.area,
      priority: item.priority || null,
      deadline: item.deadline || null,
      deadline_time: item.deadlineTime || null,
      person: item.person || null,
      asset: item.asset || null,
      value: item.value ?? null,
      tags: item.tags || [],
      linked_agenda_ids: item.linkedAgendaIds || [],
      user_id: userId,
    }).select('id').single();
    if (!error && data?.id && item.deadline) {
      pushToGoogle(data.id, 'upsert');
    }
  }, [getUserId, pushToGoogle]);

  const updateItem = useCallback(async (id: string, updates: Partial<Item>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo;
    if (updates.fase !== undefined) dbUpdates.fase = updates.fase;
    if (updates.area !== undefined) dbUpdates.area = updates.area;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.deadlineTime !== undefined) dbUpdates.deadline_time = updates.deadlineTime;
    if (updates.person !== undefined) dbUpdates.person = updates.person;
    if (updates.asset !== undefined) dbUpdates.asset = updates.asset;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.linkedAgendaIds !== undefined) dbUpdates.linked_agenda_ids = updates.linkedAgendaIds;
    const { error } = await supabase.from('items').update(dbUpdates).eq('id', id);
    if (!error) {
      // Qualquer mudança em campos que afetam o evento → push
      const affectsCalendar =
        updates.title !== undefined ||
        updates.deadline !== undefined ||
        updates.deadlineTime !== undefined ||
        updates.fase !== undefined ||
        updates.description !== undefined;
      if (affectsCalendar) pushToGoogle(id, 'upsert');
    }
  }, [pushToGoogle]);

  const deleteItem = useCallback(async (id: string) => {
    pushToGoogle(id, 'delete');
    await supabase.from('items').delete().eq('id', id);
  }, [pushToGoogle]);

  const addComment = useCallback(async (itemId: string, text: string) => {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('item_comments').insert({ item_id: itemId, text, user_id: userId });
  }, [getUserId]);

  const deleteComment = useCallback(async (itemId: string, commentId: string) => {
    await supabase.from('item_comments').delete().eq('id', commentId);
  }, []);

  // ---- MEMORY ACTIONS ----
  const addMemory = useCallback(async (memory: Omit<Memory, 'id' | 'createdAt'>) => {
    const userId = await getUserId();
    if (!userId) return;
    // Criptografa campos sensíveis antes de salvar
    const encLogin = memory.login ? await encryptString(memory.login) : null;
    const encPassword = memory.password ? await encryptString(memory.password) : null;
    const encUrl = memory.url ? await encryptString(memory.url) : null;
    await supabase.from('memories').insert({
      title: memory.title,
      content: memory.content,
      tags: memory.tags || [],
      category: memory.category || 'geral',
      area: memory.area || null,
      login: encLogin,
      password: encPassword,
      url: encUrl,
      city: memory.city || null,
      user_id: userId,
    });
  }, [getUserId]);

  const deleteMemory = useCallback(async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
  }, []);

  // ---- EVENT ACTIONS ----
  const addEvent = useCallback(async (event: Omit<AgendaEvent, 'id' | 'createdAt'>) => {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('events').insert({
      title: event.title,
      datetime: event.datetime,
      duration: event.duration ?? null,
      type: event.type,
      linked_item_id: event.linkedItemId || null,
      user_id: userId,
    });
  }, [getUserId]);

  const deleteEvent = useCallback(async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = normalizeSettings({ ...prev, ...updates });
      (async () => {
        const userId = await getUserId();
        if (!userId) return;
        const { error } = await (supabase as any)
          .from('app_settings')
          .upsert(
            { key: 'central_settings', value: next, user_id: userId },
            { onConflict: 'user_id,key' }
          );
        if (error) console.error('Erro ao sincronizar configurações', error);
      })();
      return next;
    });
  }, [getUserId]);

  return (
    <CentralContext.Provider value={{
      inbox, addInboxEntry, archiveInboxEntry, deleteInboxEntry, convertInboxToItem, convertInboxToMemory, refreshInbox,
      items, addItem, updateItem, deleteItem, addComment, deleteComment,
      memories, addMemory, deleteMemory,
      events, addEvent, deleteEvent, agendaEntries,
      settings, updateSettings,
    }}>
      {children}
    </CentralContext.Provider>
  );
}

export function useCentral() {
  const ctx = useContext(CentralContext);
  if (!ctx) throw new Error('useCentral must be used within CentralProvider');
  return ctx;
}
