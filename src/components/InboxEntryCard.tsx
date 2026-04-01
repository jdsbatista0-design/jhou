import { useState } from 'react';
import { Archive, ArrowRight, BookMarked, Trash2, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCentral } from '@/contexts/CentralContext';
import { InboxEntry } from '@/types/central';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AISuggestion {
  title: string;
  tipo: string;
  fase: string;
  area: string;
  priority?: string;
  person?: string;
  deadline?: string;
  deadlineTime?: string;
  tags: string[];
  description?: string;
}

interface AIResult {
  summary: string;
  suggestions: AISuggestion[];
}

export default function InboxEntryCard({ entry }: { entry: InboxEntry }) {
  const { archiveInboxEntry, convertInboxToItem, convertInboxToMemory, deleteInboxEntry, addItem } = useCentral();
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());

  const handleInterpret = async () => {
    setLoading(true);
    try {
      let body: any = { type: 'text', content: entry.content };

      if (entry.type === 'photo' && entry.photoUrl) {
        body = { type: 'image', content: entry.content, imageBase64: entry.photoUrl };
      } else if (entry.type === 'audio' && entry.audioUrl) {
        // Convert blob URL to base64
        try {
          const resp = await fetch(entry.audioUrl);
          const blob = await resp.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          body = { type: 'audio', content: entry.content, audioBase64: base64 };
        } catch {
          body = { type: 'text', content: entry.content };
        }
      }

      const { data, error } = await supabase.functions.invoke('interpret-content', { body });

      if (error) {
        toast.error('Erro ao interpretar conteúdo');
        console.error(error);
        return;
      }

      setAiResult(data as AIResult);
    } catch (e) {
      toast.error('Erro ao conectar com IA');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = (suggestion: AISuggestion, index: number) => {
    addItem({
      title: suggestion.title,
      description: suggestion.description,
      photoUrl: entry.type === 'photo' ? entry.photoUrl : undefined,
      tipo: suggestion.tipo || 'Ação',
      fase: suggestion.fase || 'Capturado',
      area: suggestion.area || 'Pessoal',
      priority: (suggestion.priority as any) || undefined,
      person: suggestion.person || undefined,
      deadline: suggestion.deadline ? new Date(suggestion.deadline).toISOString() : undefined,
      deadlineTime: suggestion.deadlineTime || undefined,
      tags: suggestion.tags || [],
    });
    setCreatedItems(prev => new Set(prev).add(index));
    toast.success(`Item "${suggestion.title}" criado`);
  };

  const handleCreateAll = () => {
    if (!aiResult) return;
    aiResult.suggestions.forEach((s, i) => {
      if (!createdItems.has(i)) {
        handleCreateItem(s, i);
      }
    });
    archiveInboxEntry(entry.id);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      {entry.type === 'photo' && entry.photoUrl && (
        <img src={entry.photoUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
      )}
      {entry.type === 'audio' && entry.audioUrl && (
        <audio src={entry.audioUrl} controls className="w-full h-8" />
      )}
      <p className="text-sm text-foreground leading-relaxed">{entry.content}</p>

      {/* AI Result */}
      {aiResult && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="text-[11px] text-primary font-medium">✨ {aiResult.summary}</p>
          {aiResult.suggestions.map((s, i) => (
            <div key={i} className={`bg-muted/50 rounded-lg p-2.5 space-y-1.5 ${createdItems.has(i) ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-foreground flex-1">{s.title}</p>
                <Button
                  size="sm"
                  variant={createdItems.has(i) ? 'ghost' : 'default'}
                  className="h-6 text-[10px] px-2 rounded-full shrink-0"
                  disabled={createdItems.has(i)}
                  onClick={() => handleCreateItem(s, i)}
                >
                  {createdItems.has(i) ? <><Check className="h-3 w-3 mr-1" /> Criado</> : 'Criar'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[9px]">{s.tipo}</Badge>
                <Badge variant="outline" className="text-[9px]">{s.fase}</Badge>
                <Badge variant="secondary" className="text-[9px]">{s.area}</Badge>
                {s.priority && <Badge variant="outline" className="text-[9px]">{s.priority}</Badge>}
                {s.person && <Badge variant="outline" className="text-[9px]">👤 {s.person}</Badge>}
                {s.deadline && <Badge variant="outline" className="text-[9px]">📅 {s.deadline}</Badge>}
              </div>
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.tags.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{t}</span>
                  ))}
                </div>
              )}
              {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
            </div>
          ))}
          {aiResult.suggestions.length > 1 && !aiResult.suggestions.every((_, i) => createdItems.has(i)) && (
            <Button size="sm" className="w-full rounded-xl text-xs h-8" onClick={handleCreateAll}>
              Criar todos e arquivar
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
        <div className="flex gap-1">
          {entry.status === 'pending' && !aiResult && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary"
              title="Interpretar com IA"
              onClick={handleInterpret}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Virar Item" onClick={() => convertInboxToItem(entry.id)}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Salvar como Memória" onClick={() => convertInboxToMemory(entry.id)}>
            <BookMarked className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Arquivar" onClick={() => archiveInboxEntry(entry.id)}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => deleteInboxEntry(entry.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
