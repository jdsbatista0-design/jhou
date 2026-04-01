export interface InboxEntry {
  id: string;
  content: string;
  type: 'text' | 'photo' | 'audio';
  photoUrl?: string;
  transcription?: string;
  status: 'pending' | 'processed' | 'archived';
  createdAt: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  tipo: string;
  fase: string;
  area: string;
  priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  deadline?: string;
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

export interface Settings {
  tipos: string[];
  fases: string[];
  areas: string[];
  tags: string[];
  agendaTypes: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  tipos: ['Ação', 'Oportunidade', 'Ideia', 'Pendência', 'Decisão', 'Melhoria', 'Problema'],
  fases: ['Capturado', 'Aprendendo', 'Acompanhando', 'Analisando', 'Andando', 'Aguardando', 'Travado', 'Concluído'],
  areas: ['Izi', 'Mídia', 'Incorporação', 'Stone', 'Pessoal', 'BJ7Mídia', 'Casa', 'Filhas'],
  tags: ['estratégico', 'urgente', 'receita', 'follow-up'],
  agendaTypes: ['Reunião', 'Visita', 'Compromisso', 'Prazo'],
};
