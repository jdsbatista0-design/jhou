export interface InboxEntry {
  id: string;
  content: string;
  type: 'text' | 'photo' | 'audio';
  photoUrl?: string;
  audioUrl?: string;
  transcription?: string;
  status: 'pending' | 'processed' | 'archived';
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
  priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  deadline?: string;
  deadlineTime?: string; // HH:mm for agenda integration
  person?: string;
  asset?: string;
  value?: number;
  tags: string[];
  linkedAgendaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  area?: string;
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
  tipos: ['Ação', 'Oportunidade', 'Ideia', 'Pendência', 'Decisão', 'Melhoria', 'Problema'],
  fases: ['Capturado', 'Aprendendo', 'Acompanhando', 'Analisando', 'Andando', 'Aguardando', 'Travado', 'Concluído'],
  areas: ['Izi', 'Mídia', 'Incorporação', 'Stone', 'Pessoal', 'BJ7Mídia', 'Casa', 'Filhas'],
  tagGroups: [
    { name: 'Contexto', tags: ['estratégico', 'operacional', 'pessoal', 'delegado'] },
    { name: 'Leitura', tags: ['urgente', 'importante', 'pode esperar', 'informativo'] },
    { name: 'Natureza', tags: ['receita', 'custo', 'investimento', 'relacionamento'] },
    { name: 'Resultado', tags: ['follow-up', 'decisão pendente', 'aguardando retorno', 'concluído parcial'] },
  ],
  agendaTypes: ['Reunião', 'Visita', 'Compromisso', 'Prazo'],
};

// Helper to get all tags flattened
export function getAllTags(settings: Settings): string[] {
  return settings.tagGroups.flatMap(g => g.tags);
}
