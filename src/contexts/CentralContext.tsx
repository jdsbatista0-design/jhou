import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InboxEntry, Item, ItemComment, Memory, AgendaEvent, Settings, DEFAULT_SETTINGS, Recurrence, Weekday } from '@/types/central';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDateTime } from '@/lib/dates';
import { encryptString, decryptString } from '@/lib/crypto';
import { expandRecurrence, nextHorizonDate, todayYMD } from '@/lib/recurrence';

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
  recurrences: Recurrence[];
  addRecurrence: (rec: Omit<Recurrence, 'id' | 'createdAt' | 'lastMaterializedUntil'>) => Promise<void>;
  updateRecurrence: (id: string, updates: Partial<Recurrence>) => Promise<void>;
  deleteRecurrence: (id: string, alsoDeleteFutureItems: boolean) => Promise<void>;
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
    previousFase: row.previous_fase || undefined,
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
    recurrenceId: row.recurrence_id || undefined,
    reminderMinutes: row.reminder_minutes != null ? Number(row.reminder_minutes) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbRowToRecurrence(row: any): Recurrence {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    type: row.type,
    time: row.time,
    weekdays: Array.isArray(row.weekdays) ? (row.weekdays as Weekday[]) : [],
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    reminderMinutes: row.reminder_minutes ?? 30,
    lastMaterializedUntil: row.last_materialized_until || undefined,
    active: !!row.active,
    createdAt: row.created_at,
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
    meetingDate: row.meeting_date || undefined,
    participants: row.participants || undefined,
    decisions: row.decisions || undefined,
    nextSteps: row.next_steps || undefined,
    linkedItemId: row.linked_item_id || undefined,
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
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
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

  // ---- RECURRENCES ----
  const refreshRecurrences = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('recurrences')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setRecurrences(data.map(dbRowToRecurrence));
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

  // Initial load + realtime (com debounce para evitar refetch em cascata)
  const debounceTimers = useRef<Record<string, number>>({});
  const debouncedRefresh = useCallback((key: string, fn: () => Promise<void>, ms = 800) => {
    const timers = debounceTimers.current;
    if (timers[key]) window.clearTimeout(timers[key]);
    timers[key] = window.setTimeout(() => { fn().catch(() => {}); }, ms);
  }, []);

  useEffect(() => {
    // Carrega tudo em paralelo — boot rápido
    Promise.all([
      refreshInbox(),
      refreshItems(),
      refreshMemories(),
      refreshEvents(),
      refreshRecurrences(),
      refreshSettings(),
    ]).catch(e => console.warn('boot load falhou parcialmente', e));

    const inboxCh = supabase.channel('inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_entries' },
        () => debouncedRefresh('inbox', refreshInbox, 1500))
      .subscribe();

    const itemsCh = supabase.channel('items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' },
        () => debouncedRefresh('items', refreshItems, 1500))
      .subscribe();

    const commentsCh = supabase.channel('comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_comments' },
        () => debouncedRefresh('items', refreshItems, 1500))
      .subscribe();

    const memoriesCh = supabase.channel('memories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' },
        () => debouncedRefresh('memories', refreshMemories, 1500))
      .subscribe();

    const eventsCh = supabase.channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },
        () => debouncedRefresh('events', refreshEvents, 1500))
      .subscribe();

    const recurrencesCh = supabase.channel('recurrences_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurrences' },
        () => debouncedRefresh('recurrences', refreshRecurrences, 1500))
      .subscribe();

    const settingsCh = supabase.channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' },
        () => debouncedRefresh('settings', refreshSettings, 1500))
      .subscribe();

    return () => {
      Object.values(debounceTimers.current).forEach(t => window.clearTimeout(t));
      supabase.removeChannel(inboxCh);
      supabase.removeChannel(itemsCh);
      supabase.removeChannel(commentsCh);
      supabase.removeChannel(memoriesCh);
      supabase.removeChannel(eventsCh);
      supabase.removeChannel(recurrencesCh);
      supabase.removeChannel(settingsCh);
    };
  }, [refreshInbox, refreshItems, refreshMemories, refreshEvents, refreshRecurrences, refreshSettings, debouncedRefresh]);

  // Auto-pull do Google Calendar a cada 5 minutos quando a aba está visível.
  // Adiamos a 1ª verificação em 30s para não competir com o boot inicial.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.hidden) return;
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
    const initial = window.setTimeout(tick, 30_000);
    const timer = window.setInterval(tick, 300_000);
    return () => {
      cancelled = true;
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
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: InboxEntry = {
      id: tempId,
      content, type,
      photoUrl, audioUrl,
      status: 'pending',
      source: 'app',
      createdAt: new Date().toISOString(),
    };
    setInbox(prev => [optimistic, ...prev]);

    const entry: any = { content, type, status: 'pending', source: 'app', user_id: userId };
    if (photoUrl) entry.photo_url = photoUrl;
    if (audioUrl) entry.audio_url = audioUrl;
    const { data, error } = await supabase.from('inbox_entries').insert(entry).select('*').single();
    if (error) {
      setInbox(prev => prev.filter(e => e.id !== tempId));
      return;
    }
    if (data) {
      setInbox(prev => prev.map(e => (e.id === tempId ? dbRowToInboxEntry(data) : e)));
    }
  }, [getUserId]);

  const archiveInboxEntry = useCallback(async (id: string) => {
    let snapshot: InboxEntry[] = [];
    setInbox(prev => {
      snapshot = prev;
      return prev.map(e => (e.id === id ? { ...e, status: 'archived' } : e));
    });
    const { error } = await supabase.from('inbox_entries').update({ status: 'archived' }).eq('id', id);
    if (error) setInbox(snapshot);
  }, []);

  const deleteInboxEntry = useCallback(async (id: string) => {
    let snapshot: InboxEntry[] = [];
    setInbox(prev => {
      snapshot = prev;
      return prev.filter(e => e.id !== id);
    });
    const { error } = await supabase.from('inbox_entries').delete().eq('id', id);
    if (error) setInbox(snapshot);
  }, []);

  // ---- CONVERT INBOX ----
  const convertInboxToItem = useCallback(async (id: string, title?: string) => {
    const userId = await getUserId();
    if (!userId) return;
    let entry: InboxEntry | undefined;
    setInbox(prev => { entry = prev.find(e => e.id === id); return prev; });
    if (!entry) return;
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
  }, [settings, getUserId]);

  const convertInboxToMemory = useCallback(async (id: string, title?: string) => {
    const userId = await getUserId();
    if (!userId) return;
    let entry: InboxEntry | undefined;
    setInbox(prev => { entry = prev.find(e => e.id === id); return prev; });
    if (!entry) return;
    const { error } = await supabase.from('memories').insert({
      title: title || entry.content.slice(0, 100),
      content: entry.content,
      category: 'geral',
      user_id: userId,
    });
    if (!error) {
      await supabase.from('inbox_entries').update({ status: 'processed' }).eq('id', id);
    }
  }, [getUserId]);

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
    const tempId = `tmp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: Item = {
      id: tempId,
      title: item.title,
      description: item.description,
      photoUrl: item.photoUrl,
      tipo: item.tipo,
      fase: item.fase,
      area: item.area,
      priority: item.priority,
      deadline: item.deadline,
      deadlineTime: item.deadlineTime,
      person: item.person,
      asset: item.asset,
      value: item.value,
      tags: item.tags || [],
      linkedAgendaIds: item.linkedAgendaIds || [],
      comments: item.comments || [],
      recurrenceId: item.recurrenceId,
      reminderMinutes: item.reminderMinutes,
      createdAt: now,
      updatedAt: now,
    };
    setItems(prev => [optimistic, ...prev]);

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
      recurrence_id: item.recurrenceId || null,
      reminder_minutes: item.reminderMinutes ?? null,
      user_id: userId,
    } as any).select('*').single();

    if (error) {
      // Rollback optimistic add
      setItems(prev => prev.filter(i => i.id !== tempId));
      return;
    }
    if (data) {
      // Replace temp with real row (preserves order at top)
      setItems(prev => prev.map(i => (i.id === tempId ? dbRowToItem(data, []) : i)));
      if (item.deadline) pushToGoogle(data.id, 'upsert');
    }
  }, [getUserId, pushToGoogle]);

  const updateItem = useCallback(async (id: string, updates: Partial<Item>) => {
    // Optimistic local update — UI reflects instantly (e.g. fase: 'Concluído')
    let prevSnapshot: Item | undefined;
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      prevSnapshot = i;
      return { ...i, ...updates, updatedAt: new Date().toISOString() };
    }));

    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo;
    if (updates.fase !== undefined) dbUpdates.fase = updates.fase;
    if (updates.previousFase !== undefined) dbUpdates.previous_fase = updates.previousFase || null;
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
    if (error) {
      // Rollback to snapshot
      if (prevSnapshot) {
        const snap = prevSnapshot;
        setItems(prev => prev.map(i => (i.id === id ? snap : i)));
      }
      return;
    }
    // Qualquer mudança em campos que afetam o evento → push
    const affectsCalendar =
      updates.title !== undefined ||
      updates.deadline !== undefined ||
      updates.deadlineTime !== undefined ||
      updates.fase !== undefined ||
      updates.description !== undefined;
    if (affectsCalendar) pushToGoogle(id, 'upsert');
  }, [pushToGoogle]);

  const deleteItem = useCallback(async (id: string) => {
    let snapshot: Item[] = [];
    setItems(prev => {
      snapshot = prev;
      return prev.filter(i => i.id !== id);
    });
    pushToGoogle(id, 'delete');
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) setItems(snapshot);
  }, [pushToGoogle]);

  const addComment = useCallback(async (itemId: string, text: string) => {
    const userId = await getUserId();
    if (!userId) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: ItemComment = { id: tempId, text, createdAt: new Date().toISOString() };
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, comments: [...i.comments, optimistic] } : i)));

    const { data, error } = await supabase.from('item_comments')
      .insert({ item_id: itemId, text, user_id: userId })
      .select('*').single();
    if (error) {
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, comments: i.comments.filter(c => c.id !== tempId) } : i)));
      return;
    }
    if (data) {
      const real: ItemComment = { id: data.id, text: data.text, createdAt: data.created_at };
      setItems(prev => prev.map(i => (i.id === itemId
        ? { ...i, comments: i.comments.map(c => (c.id === tempId ? real : c)) }
        : i)));
    }
  }, [getUserId]);

  const deleteComment = useCallback(async (itemId: string, commentId: string) => {
    let prevSnap: ItemComment[] | undefined;
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      prevSnap = i.comments;
      return { ...i, comments: i.comments.filter(c => c.id !== commentId) };
    }));
    const { error } = await supabase.from('item_comments').delete().eq('id', commentId);
    if (error && prevSnap) {
      const snap = prevSnap;
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, comments: snap } : i)));
    }
  }, []);

  // ---- MEMORY ACTIONS ----
  const addMemory = useCallback(async (memory: Omit<Memory, 'id' | 'createdAt'>) => {
    const userId = await getUserId();
    if (!userId) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Memory = {
      id: tempId,
      title: memory.title,
      content: memory.content,
      tags: memory.tags || [],
      category: memory.category || 'geral',
      area: memory.area,
      login: memory.login,
      password: memory.password,
      url: memory.url,
      city: memory.city,
      meetingDate: memory.meetingDate,
      participants: memory.participants,
      decisions: memory.decisions,
      nextSteps: memory.nextSteps,
      linkedItemId: memory.linkedItemId,
      createdAt: new Date().toISOString(),
    };
    setMemories(prev => [optimistic, ...prev]);

    // Criptografa campos sensíveis antes de salvar
    const encLogin = memory.login ? await encryptString(memory.login) : null;
    const encPassword = memory.password ? await encryptString(memory.password) : null;
    const encUrl = memory.url ? await encryptString(memory.url) : null;
    const { data, error } = await supabase.from('memories').insert({
      title: memory.title,
      content: memory.content,
      tags: memory.tags || [],
      category: memory.category || 'geral',
      area: memory.area || null,
      login: encLogin,
      password: encPassword,
      url: encUrl,
      city: memory.city || null,
      meeting_date: memory.meetingDate || null,
      participants: memory.participants || null,
      decisions: memory.decisions || null,
      next_steps: memory.nextSteps || null,
      linked_item_id: memory.linkedItemId || null,
      user_id: userId,
    } as any).select('*').single();

    if (error) {
      setMemories(prev => prev.filter(m => m.id !== tempId));
      return;
    }
    if (data) {
      // Replace temp with real (decrypt for plaintext fields)
      const real = await dbRowToMemory(data);
      setMemories(prev => prev.map(m => (m.id === tempId ? real : m)));
    }
  }, [getUserId]);

  const deleteMemory = useCallback(async (id: string) => {
    let snapshot: Memory[] = [];
    setMemories(curr => {
      snapshot = curr;
      return curr.filter(m => m.id !== id);
    });
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) setMemories(snapshot);
  }, []);

  // ---- EVENT ACTIONS ----
  const addEvent = useCallback(async (event: Omit<AgendaEvent, 'id' | 'createdAt'>) => {
    const userId = await getUserId();
    if (!userId) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: AgendaEvent = {
      id: tempId,
      title: event.title,
      datetime: event.datetime,
      duration: event.duration,
      type: event.type,
      linkedItemId: event.linkedItemId,
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from('events').insert({
      title: event.title,
      datetime: event.datetime,
      duration: event.duration ?? null,
      type: event.type,
      linked_item_id: event.linkedItemId || null,
      user_id: userId,
    }).select('*').single();
    if (error) {
      setEvents(prev => prev.filter(e => e.id !== tempId));
      return;
    }
    if (data) {
      setEvents(prev => prev.map(e => (e.id === tempId ? dbRowToEvent(data) : e)));
    }
  }, [getUserId]);

  const deleteEvent = useCallback(async (id: string) => {
    let snapshot: AgendaEvent[] = [];
    setEvents(curr => {
      snapshot = curr;
      return curr.filter(e => e.id !== id);
    });
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) setEvents(snapshot);
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

  // ---- RECURRENCE ACTIONS ----

  /**
   * Materializes occurrences of a recurrence as Items.
   * Skips dates already materialized (based on recurrence_id + deadline).
   * Returns the new horizon date (lastMaterializedUntil).
   */
  const materializeRecurrence = useCallback(async (rec: Recurrence, userId: string): Promise<string> => {
    const horizon = nextHorizonDate();
    const horizonYMD = horizon.toISOString().slice(0, 10);
    const fromDate = rec.lastMaterializedUntil
      ? new Date(rec.lastMaterializedUntil + 'T00:00:00')
      : new Date(rec.startDate + 'T00:00:00');
    // Always start from max(today, fromDate) to never create past occurrences
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = fromDate > today ? fromDate : today;

    const dates = expandRecurrence(rec, start, horizon);
    if (dates.length === 0) return horizonYMD;

    // Filter dates that already exist (recurrence_id + deadline)
    const { data: existing } = await (supabase as any)
      .from('items')
      .select('deadline')
      .eq('recurrence_id', rec.id)
      .in('deadline', dates);
    const existingSet = new Set((existing || []).map((r: any) => r.deadline));

    const rows = dates
      .filter(d => !existingSet.has(d))
      .map(d => ({
        title: rec.title,
        tipo: rec.type || 'Compromisso',
        fase: 'Em andamento',
        area: rec.area,
        deadline: d,
        deadline_time: rec.time,
        tags: [rec.type || 'Compromisso'],
        recurrence_id: rec.id,
        reminder_minutes: rec.reminderMinutes,
        user_id: userId,
      }));

    if (rows.length > 0) {
      const { error } = await (supabase as any).from('items').insert(rows);
      if (error) console.error('materialize insert failed', error);
    }
    return horizonYMD;
  }, []);

  const addRecurrence = useCallback(async (rec: Omit<Recurrence, 'id' | 'createdAt' | 'lastMaterializedUntil'>) => {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await (supabase as any).from('recurrences').insert({
      title: rec.title,
      area: rec.area,
      type: rec.type,
      time: rec.time,
      weekdays: rec.weekdays,
      start_date: rec.startDate,
      end_date: rec.endDate || null,
      reminder_minutes: rec.reminderMinutes,
      active: rec.active,
      user_id: userId,
    }).select('*').single();
    if (error || !data) {
      console.error('addRecurrence failed', error);
      return;
    }
    const created = dbRowToRecurrence(data);
    setRecurrences(prev => [created, ...prev]);

    // Materialize and update horizon
    const newHorizon = await materializeRecurrence(created, userId);
    await (supabase as any)
      .from('recurrences')
      .update({ last_materialized_until: newHorizon })
      .eq('id', created.id);
    setRecurrences(prev => prev.map(r => r.id === created.id ? { ...r, lastMaterializedUntil: newHorizon } : r));
    refreshItems();
  }, [getUserId, materializeRecurrence, refreshItems]);

  const updateRecurrence = useCallback(async (id: string, updates: Partial<Recurrence>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.area !== undefined) dbUpdates.area = updates.area;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.weekdays !== undefined) dbUpdates.weekdays = updates.weekdays;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
    if (updates.reminderMinutes !== undefined) dbUpdates.reminder_minutes = updates.reminderMinutes;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    // Structural changes invalidate future occurrences — wipe and rebuild
    const structural = updates.weekdays !== undefined || updates.time !== undefined ||
      updates.startDate !== undefined || updates.endDate !== undefined ||
      updates.active !== undefined;
    if (structural) dbUpdates.last_materialized_until = null;

    const { data, error } = await (supabase as any).from('recurrences')
      .update(dbUpdates).eq('id', id).select('*').single();
    if (error || !data) return;
    const updated = dbRowToRecurrence(data);
    setRecurrences(prev => prev.map(r => r.id === id ? updated : r));

    if (structural) {
      // Delete future non-completed items linked to this recurrence
      const today = todayYMD();
      await (supabase as any).from('items')
        .delete()
        .eq('recurrence_id', id)
        .gte('deadline', today)
        .neq('fase', 'Concluído');

      const userId = await getUserId();
      if (userId && updated.active) {
        const newHorizon = await materializeRecurrence(updated, userId);
        await (supabase as any).from('recurrences')
          .update({ last_materialized_until: newHorizon })
          .eq('id', id);
        setRecurrences(prev => prev.map(r => r.id === id ? { ...r, lastMaterializedUntil: newHorizon } : r));
      }
      refreshItems();
    } else if (updates.title !== undefined || updates.area !== undefined ||
               updates.type !== undefined || updates.reminderMinutes !== undefined) {
      // Propagate label/reminder changes to future, non-completed occurrences
      const today = todayYMD();
      const itemPatch: any = {};
      if (updates.title !== undefined) itemPatch.title = updates.title;
      if (updates.area !== undefined) itemPatch.area = updates.area;
      if (updates.type !== undefined) itemPatch.tipo = updates.type;
      if (updates.reminderMinutes !== undefined) itemPatch.reminder_minutes = updates.reminderMinutes;
      await (supabase as any).from('items')
        .update(itemPatch)
        .eq('recurrence_id', id)
        .gte('deadline', today)
        .neq('fase', 'Concluído');
      refreshItems();
    }
  }, [getUserId, materializeRecurrence, refreshItems]);

  const deleteRecurrence = useCallback(async (id: string, alsoDeleteFutureItems: boolean) => {
    if (alsoDeleteFutureItems) {
      const today = todayYMD();
      await (supabase as any).from('items')
        .delete()
        .eq('recurrence_id', id)
        .gte('deadline', today)
        .neq('fase', 'Concluído');
    }
    const { error } = await (supabase as any).from('recurrences').delete().eq('id', id);
    if (error) return;
    setRecurrences(prev => prev.filter(r => r.id !== id));
    if (alsoDeleteFutureItems) refreshItems();
  }, [refreshItems]);

  // Top-up materialization: extends horizon for active recurrences once a day on app open.
  useEffect(() => {
    if (recurrences.length === 0) return;
    const todayStr = todayYMD();
    let changed = false;
    (async () => {
      const userId = await getUserId();
      if (!userId) return;
      for (const rec of recurrences) {
        if (!rec.active) continue;
        if (rec.lastMaterializedUntil && rec.lastMaterializedUntil >= todayStr) {
          // Only re-materialize if horizon is less than 7 days ahead of today
          const horizonDate = new Date(rec.lastMaterializedUntil + 'T00:00:00');
          const today = new Date(todayStr + 'T00:00:00');
          const diffDays = (horizonDate.getTime() - today.getTime()) / 86400000;
          if (diffDays > 7) continue;
        }
        const newHorizon = await materializeRecurrence(rec, userId);
        await (supabase as any).from('recurrences')
          .update({ last_materialized_until: newHorizon })
          .eq('id', rec.id);
        changed = true;
      }
      if (changed) {
        refreshRecurrences();
        refreshItems();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrences.length]);

  const ctxValue = useMemo<CentralContextType>(() => ({
    inbox, addInboxEntry, archiveInboxEntry, deleteInboxEntry, convertInboxToItem, convertInboxToMemory, refreshInbox,
    items, addItem, updateItem, deleteItem, addComment, deleteComment,
    memories, addMemory, deleteMemory,
    events, addEvent, deleteEvent, agendaEntries,
    recurrences, addRecurrence, updateRecurrence, deleteRecurrence,
    settings, updateSettings,
  }), [
    inbox, items, memories, events, agendaEntries, recurrences, settings,
    addInboxEntry, archiveInboxEntry, deleteInboxEntry, convertInboxToItem, convertInboxToMemory, refreshInbox,
    addItem, updateItem, deleteItem, addComment, deleteComment,
    addMemory, deleteMemory, addEvent, deleteEvent,
    addRecurrence, updateRecurrence, deleteRecurrence, updateSettings,
  ]);

  return (
    <CentralContext.Provider value={ctxValue}>
      {children}
    </CentralContext.Provider>
  );
}

export function useCentral() {
  const ctx = useContext(CentralContext);
  if (!ctx) throw new Error('useCentral must be used within CentralProvider');
  return ctx;
}
