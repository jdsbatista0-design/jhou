import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { InboxEntry, Item, ItemComment, Memory, AgendaEvent, Settings, DEFAULT_SETTINGS } from '@/types/central';
import { supabase } from '@/integrations/supabase/client';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    if (key === 'central_settings' && parsed.tags && !parsed.tagGroups) {
      return { ...fallback, ...parsed, tagGroups: (fallback as any).tagGroups } as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
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

export function CentralProvider({ children }: { children: React.ReactNode }) {
  const [inbox, setInbox] = useState<InboxEntry[]>([]);
  const [items, setItems] = useState<Item[]>(() => loadFromStorage('central_items', []));
  const [memories, setMemories] = useState<Memory[]>(() => loadFromStorage('central_memories', []));
  const [events, setEvents] = useState<AgendaEvent[]>(() => loadFromStorage('central_events', []));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage('central_settings', DEFAULT_SETTINGS));

  // Load inbox from database
  const refreshInbox = useCallback(async () => {
    const { data, error } = await supabase
      .from('inbox_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInbox(data.map(dbRowToInboxEntry));
    }
  }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    refreshInbox();

    const channel = supabase
      .channel('inbox_entries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_entries' },
        () => {
          refreshInbox();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshInbox]);

  useEffect(() => saveToStorage('central_items', items), [items]);
  useEffect(() => saveToStorage('central_memories', memories), [memories]);
  useEffect(() => saveToStorage('central_events', events), [events]);
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

    return [...fromItems, ...fromEvents].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
  }, [items, events]);

  const addInboxEntry = useCallback(async (content: string, type: InboxEntry['type'], photoUrl?: string, audioUrl?: string) => {
    const entry: any = {
      content,
      type,
      status: 'pending',
      source: 'app',
    };
    if (photoUrl) entry.photo_url = photoUrl;
    if (audioUrl) entry.audio_url = audioUrl;

    const { error } = await supabase.from('inbox_entries').insert(entry);
    if (!error) {
      await refreshInbox();
    }
  }, [refreshInbox]);

  const archiveInboxEntry = useCallback(async (id: string) => {
    await supabase.from('inbox_entries').update({ status: 'archived' }).eq('id', id);
    setInbox(prev => prev.map(e => e.id === id ? { ...e, status: 'archived' as const } : e));
  }, []);

  const deleteInboxEntry = useCallback(async (id: string) => {
    await supabase.from('inbox_entries').delete().eq('id', id);
    setInbox(prev => prev.filter(e => e.id !== id));
  }, []);

  const convertInboxToItem = useCallback((id: string, title?: string) => {
    const entry = inbox.find(e => e.id === id);
    if (!entry) return;
    const now = new Date().toISOString();
    const newItem: Item = {
      id: generateId(),
      title: title || entry.content.slice(0, 100),
      description: entry.content,
      photoUrl: entry.photoUrl,
      tipo: settings.tipos[0],
      fase: settings.fases[0],
      area: settings.areas[0],
      tags: [],
      linkedAgendaIds: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    setItems(p => [newItem, ...p]);
    // Mark as processed in DB
    supabase.from('inbox_entries').update({ status: 'processed' }).eq('id', id).then();
    setInbox(prev => prev.map(e => e.id === id ? { ...e, status: 'processed' as const } : e));
  }, [inbox, settings]);

  const convertInboxToMemory = useCallback((id: string, title?: string) => {
    const entry = inbox.find(e => e.id === id);
    if (!entry) return;
    const newMemory: Memory = {
      id: generateId(),
      title: title || entry.content.slice(0, 100),
      content: entry.content,
      tags: [],
      category: 'geral',
      createdAt: new Date().toISOString(),
    };
    setMemories(p => [newMemory, ...p]);
    supabase.from('inbox_entries').update({ status: 'processed' }).eq('id', id).then();
    setInbox(prev => prev.map(e => e.id === id ? { ...e, status: 'processed' as const } : e));
  }, [inbox]);

  const addItem = useCallback((item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'linkedAgendaIds' | 'comments'> & Partial<Pick<Item, 'tags' | 'linkedAgendaIds' | 'comments'>>) => {
    const now = new Date().toISOString();
    setItems(prev => [{
      ...item,
      id: generateId(),
      tags: item.tags || [],
      linkedAgendaIds: item.linkedAgendaIds || [],
      comments: item.comments || [],
      createdAt: now,
      updatedAt: now,
    }, ...prev]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Item>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const addComment = useCallback((itemId: string, text: string) => {
    const comment: ItemComment = { id: generateId(), text, createdAt: new Date().toISOString() };
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, comments: [...(i.comments || []), comment], updatedAt: new Date().toISOString() } : i));
  }, []);

  const deleteComment = useCallback((itemId: string, commentId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, comments: (i.comments || []).filter(c => c.id !== commentId) } : i));
  }, []);

  const addMemory = useCallback((memory: Omit<Memory, 'id' | 'createdAt'>) => {
    setMemories(prev => [{ ...memory, id: generateId(), category: memory.category || 'geral', createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const addEvent = useCallback((event: Omit<AgendaEvent, 'id' | 'createdAt'>) => {
    setEvents(prev => [{ ...event, id: generateId(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

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
