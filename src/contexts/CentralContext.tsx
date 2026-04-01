import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InboxEntry, Item, Memory, AgendaEvent, Settings, DEFAULT_SETTINGS } from '@/types/central';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

interface CentralContextType {
  // Inbox
  inbox: InboxEntry[];
  addInboxEntry: (content: string, type: InboxEntry['type'], photoUrl?: string) => void;
  archiveInboxEntry: (id: string) => void;
  convertInboxToItem: (id: string, title?: string) => void;
  convertInboxToMemory: (id: string, title?: string) => void;
  convertInboxToAgenda: (id: string, datetime: string) => void;
  // Items
  items: Item[];
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'linkedAgendaIds'> & Partial<Pick<Item, 'tags' | 'linkedAgendaIds'>>) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  // Memory
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => void;
  deleteMemory: (id: string) => void;
  // Agenda
  events: AgendaEvent[];
  addEvent: (event: Omit<AgendaEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, updates: Partial<AgendaEvent>) => void;
  deleteEvent: (id: string) => void;
  // Settings
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const CentralContext = createContext<CentralContextType | null>(null);

export function CentralProvider({ children }: { children: React.ReactNode }) {
  const [inbox, setInbox] = useState<InboxEntry[]>(() => loadFromStorage('central_inbox', []));
  const [items, setItems] = useState<Item[]>(() => loadFromStorage('central_items', []));
  const [memories, setMemories] = useState<Memory[]>(() => loadFromStorage('central_memories', []));
  const [events, setEvents] = useState<AgendaEvent[]>(() => loadFromStorage('central_events', []));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage('central_settings', DEFAULT_SETTINGS));

  useEffect(() => saveToStorage('central_inbox', inbox), [inbox]);
  useEffect(() => saveToStorage('central_items', items), [items]);
  useEffect(() => saveToStorage('central_memories', memories), [memories]);
  useEffect(() => saveToStorage('central_events', events), [events]);
  useEffect(() => saveToStorage('central_settings', settings), [settings]);

  const addInboxEntry = useCallback((content: string, type: InboxEntry['type'], photoUrl?: string) => {
    setInbox(prev => [{
      id: generateId(),
      content,
      type,
      photoUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const archiveInboxEntry = useCallback((id: string) => {
    setInbox(prev => prev.map(e => e.id === id ? { ...e, status: 'archived' as const } : e));
  }, []);

  const convertInboxToItem = useCallback((id: string, title?: string) => {
    setInbox(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;
      const now = new Date().toISOString();
      const newItem: Item = {
        id: generateId(),
        title: title || entry.content.slice(0, 100),
        description: entry.content,
        tipo: settings.tipos[0],
        fase: settings.fases[0],
        area: settings.areas[0],
        tags: [],
        linkedAgendaIds: [],
        createdAt: now,
        updatedAt: now,
      };
      setItems(p => [newItem, ...p]);
      return prev.map(e => e.id === id ? { ...e, status: 'processed' as const } : e);
    });
  }, [settings]);

  const convertInboxToMemory = useCallback((id: string, title?: string) => {
    setInbox(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;
      const newMemory: Memory = {
        id: generateId(),
        title: title || entry.content.slice(0, 100),
        content: entry.content,
        tags: [],
        createdAt: new Date().toISOString(),
      };
      setMemories(p => [newMemory, ...p]);
      return prev.map(e => e.id === id ? { ...e, status: 'processed' as const } : e);
    });
  }, []);

  const convertInboxToAgenda = useCallback((id: string, datetime: string) => {
    setInbox(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;
      const newEvent: AgendaEvent = {
        id: generateId(),
        title: entry.content.slice(0, 100),
        datetime,
        type: settings.agendaTypes[0],
        createdAt: new Date().toISOString(),
      };
      setEvents(p => [newEvent, ...p]);
      return prev.map(e => e.id === id ? { ...e, status: 'processed' as const } : e);
    });
  }, [settings]);

  const addItem = useCallback((item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'linkedAgendaIds'> & Partial<Pick<Item, 'tags' | 'linkedAgendaIds'>>) => {
    const now = new Date().toISOString();
    setItems(prev => [{
      ...item,
      id: generateId(),
      tags: item.tags || [],
      linkedAgendaIds: item.linkedAgendaIds || [],
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

  const addMemory = useCallback((memory: Omit<Memory, 'id' | 'createdAt'>) => {
    setMemories(prev => [{ ...memory, id: generateId(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const addEvent = useCallback((event: Omit<AgendaEvent, 'id' | 'createdAt'>) => {
    setEvents(prev => [{ ...event, id: generateId(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<AgendaEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <CentralContext.Provider value={{
      inbox, addInboxEntry, archiveInboxEntry, convertInboxToItem, convertInboxToMemory, convertInboxToAgenda,
      items, addItem, updateItem, deleteItem,
      memories, addMemory, deleteMemory,
      events, addEvent, updateEvent, deleteEvent,
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
