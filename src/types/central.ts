export interface InboxEntry {
  id: string;
  content: string;
  type: 'text' | 'photo' | 'audio';
  photoUrl?: string;
  audioUrl?: string;
  transcription?: string;
  status: 'pending' | 'processed' | 'archived';
  source?: 'app' | 'whatsapp';
  whatsappFrom?: string;
  createdAt: string;
}

export interface ItemComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  photoUrl?: string;
  tipo: string;
  fase: string;
  area: string;
  priority?: 'baixa' | 'media' | 'alta';
  deadline?: string;
  deadlineTime?: string; // HH:mm for agenda integration
  person?: string;
  asset?: string;
  value?: number;
  tags: string[];
  linkedAgendaIds: string[];
  comments: ItemComment[];
  createdAt: string;
  updatedAt: string;
}

export type MemoryCategory = 
  | 'senhas'
  | 'receitas'
  | 'viagens'
  | 'livro'
  | 'desejos'
  | 'proposito'
  | 'rotina'
  | 'geral';

export const MEMORY_CATEGORIES: { value: MemoryCategory; label: string; icon: string }[] = [
  { value: 'geral', label: 'Geral', icon: '📝' },
  { value: 'senhas', label: 'Senhas', icon: '🔐' },
  { value: 'receitas', label: 'Receitas', icon: '🍳' },
  { value: 'viagens', label: 'Viagens', icon: '✈️' },
  { value: 'livro', label: 'Meu Livro', icon: '📖' },
  { value: 'desejos', label: 'Desejos', icon: '⭐' },
  { value: 'proposito', label: 'Propósito', icon: '🧭' },
  { value: 'rotina', label: 'Rotina', icon: '⏰' },
];

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: MemoryCategory;
  area?: string;
  // Extra fields for specific categories
  login?: string;
  password?: string;
  url?: string;
  city?: string;
  createdAt: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  datetime: string;
  duration?: number;
  type: string;
  linkedItemId?: string;
  createdAt: string;
}

export interface TagGroup {
  name: string;
  tags: string[];
}

export interface Settings {
  tipos: string[];
  fases: string[];
  areas: string[];
  tagGroups: TagGroup[];
  agendaTypes: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  tipos: ['Inbox', 'Ação', 'Nota'],
  fases: ['Inbox', 'Em andamento', 'Aguardando', 'Travado', 'Concluído'],
  areas: ['Izi', 'Mídia', 'Incorporação', 'Stone', 'Pessoal', 'BJ7Mídia', 'Casa', 'Filhas'],
  tagGroups: [
    { name: 'Contexto', tags: ['estratégico', 'operacional', 'pessoal', 'delegado'] },
    { name: 'Status', tags: ['urgente', 'importante', 'aguardando retorno'] },
  ],
  agendaTypes: ['Reunião', 'Visita', 'Compromisso', 'Prazo'],
};

// Helper to get all tags flattened
export function getAllTags(settings: Settings): string[] {
  return settings.tagGroups.flatMap(g => g.tags);
}
