import { useState, useEffect, useRef } from 'react';
import { Archive, ArrowRight, BookMarked, Trash2, Loader2, Check, Pencil, X, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCentral } from '@/contexts/CentralContext';
import { InboxEntry } from '@/types/central';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getDatePart } from '@/lib/dates';

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
  const { archiveInboxEntry, convertInboxToItem, convertInboxToMemory, deleteInboxEntry, addItem, settings } = useCentral();
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AISuggestion | null>(null);
  const hasTriggeredRef = useRef(false);

  const handleInterpret = async () => {
    setLoading(true);
    try {
      let body: any = { type: 'text', content: entry.content };

      if (entry.type === 'photo' && entry.photoUrl) {
        body = { type: 'image', content: entry.content, imageBase64: entry.photoUrl };
      } else if (entry.type === 'audio' && entry.audioUrl) {
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

      const result = data as AIResult;
      setAiResult(result);
      // Select all by default
      setSelectedItems(new Set(result.suggestions.map((_, i) => i)));
    } catch (e) {
      toast.error('Erro ao conectar com IA');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger AI analysis for pending entries
  useEffect(() => {
    if (entry.status === 'pending' && !aiResult && !loading && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handleInterpret();
    }
  }, []);

  const toggleSelect = (index: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const startEditing = (suggestion: AISuggestion, index: number) => {
    setEditingIndex(index);
    setEditForm({ ...suggestion });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEdit = (index: number) => {
    if (!aiResult || !editForm) return;
    const updated = { ...aiResult };
    updated.suggestions = [...updated.suggestions];
    updated.suggestions[index] = editForm;
    setAiResult(updated);
    setEditingIndex(null);
    setEditForm(null);
  };

  const createFromSuggestion = (suggestion: AISuggestion, index: number) => {
    addItem({
      title: suggestion.title,
      description: suggestion.description,
      photoUrl: entry.type === 'photo' ? entry.photoUrl : undefined,
      tipo: suggestion.tipo || 'Ação',
      fase: suggestion.fase || 'Inbox',
      area: suggestion.area || 'Pessoal',
      priority: (suggestion.priority as any) || undefined,
      person: suggestion.person || undefined,
      deadline: getDatePart(suggestion.deadline),
      deadlineTime: suggestion.deadlineTime || undefined,
      tags: suggestion.tags || [],
    });
    setCreatedItems(prev => new Set(prev).add(index));
  };

  const handleCreateSelected = () => {
    if (!aiResult) return;
    let count = 0;
    aiResult.suggestions.forEach((s, i) => {
      if (selectedItems.has(i) && !createdItems.has(i)) {
        createFromSuggestion(s, i);
        count++;
      }
    });
    if (count > 0) {
      toast.success(`${count} item(ns) criado(s)`);
      archiveInboxEntry(entry.id);
    }
  };

  const pendingSuggestions = aiResult ? aiResult.suggestions.filter((_, i) => !createdItems.has(i)) : [];
  const selectedCount = aiResult ? aiResult.suggestions.filter((_, i) => selectedItems.has(i) && !createdItems.has(i)).length : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      {entry.source === 'whatsapp' && (
        <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
          <span>📱 WhatsApp</span>
          {entry.whatsappFrom && <span className="text-muted-foreground">• {entry.whatsappFrom}</span>}
        </div>
      )}
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
            <div key={i} className={cn('rounded-lg p-2.5 space-y-1.5 transition-colors',
              createdItems.has(i) ? 'bg-muted/30 opacity-50' :
              selectedItems.has(i) ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50 border border-transparent'
            )}>
              {editingIndex === i && editForm ? (
                <div className="space-y-2">
                  <Input
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Título"
                    className="rounded-lg h-8 text-xs"
                  />
                  <Input
                    value={editForm.description || ''}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descrição"
                    className="rounded-lg h-8 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <Select value={editForm.tipo} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                      <SelectTrigger className="rounded-lg h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{settings.tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={editForm.fase} onValueChange={v => setEditForm({ ...editForm, fase: v })}>
                      <SelectTrigger className="rounded-lg h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{settings.fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={editForm.area} onValueChange={v => setEditForm({ ...editForm, area: v })}>
                      <SelectTrigger className="rounded-lg h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Select value={editForm.priority || '_none'} onValueChange={v => setEditForm({ ...editForm, priority: v === '_none' ? undefined : v })}>
                      <SelectTrigger className="rounded-lg h-7 text-[10px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem prioridade</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={editForm.person || ''}
                      onChange={e => setEditForm({ ...editForm, person: e.target.value })}
                      placeholder="Pessoa"
                      className="rounded-lg h-7 text-[10px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input type="date" value={editForm.deadline || ''} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} className="rounded-lg h-7 text-[10px]" />
                    <Input type="time" value={editForm.deadlineTime || ''} onChange={e => setEditForm({ ...editForm, deadlineTime: e.target.value })} className="rounded-lg h-7 text-[10px]" />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" className="h-6 text-[10px] px-3 rounded-full flex-1" onClick={() => saveEdit(i)}>
                      Salvar edição
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full" onClick={cancelEditing}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    {!createdItems.has(i) && (
                      <button onClick={() => toggleSelect(i)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(i) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                    )}
                    {createdItems.has(i) && <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{s.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-[9px]">{s.tipo}</Badge>
                        <Badge variant="outline" className="text-[9px]">{s.fase}</Badge>
                        <Badge variant="secondary" className="text-[9px]">{s.area}</Badge>
                        {s.priority && <Badge variant="outline" className="text-[9px]">{s.priority}</Badge>}
                        {s.person && <Badge variant="outline" className="text-[9px]">👤 {s.person}</Badge>}
                        {s.deadline && <Badge variant="outline" className="text-[9px]">📅 {s.deadline}</Badge>}
                      </div>
                      {s.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.tags.map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{t}</span>
                          ))}
                        </div>
                      )}
                      {s.description && <p className="text-[10px] text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                    {!createdItems.has(i) && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full shrink-0" onClick={() => startEditing(s, i)} title="Editar">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {pendingSuggestions.length > 0 && (
            <Button
              size="sm"
              className="w-full rounded-xl text-xs h-8"
              onClick={handleCreateSelected}
              disabled={selectedCount === 0}
            >
              Criar {selectedCount} selecionado(s)
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
        <div className="flex gap-1">
          {loading && (
            <div className="h-7 w-7 flex items-center justify-center text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
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
