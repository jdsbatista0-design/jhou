import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCentral } from '@/contexts/CentralContext';
import { Item, getAllTags } from '@/types/central';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, settings, addItem, updateItem, deleteItem, addComment, deleteComment } = useCentral();
  const isNew = id === 'new';
  const existing = !isNew ? items.find(i => i.id === id) : null;

  const [commentText, setCommentText] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    tipo: settings.tipos[0],
    fase: settings.fases[0],
    area: settings.areas[0],
    priority: '' as string,
    deadline: '',
    deadlineTime: '',
    person: '',
    value: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description || '',
        tipo: existing.tipo,
        fase: existing.fase,
        area: existing.area,
        priority: existing.priority || '',
        deadline: existing.deadline ? existing.deadline.split('T')[0] : '',
        deadlineTime: existing.deadlineTime || '',
        person: existing.person || '',
        value: existing.value ? existing.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
        tags: existing.tags || [],
      });
    }
  }, [existing]);

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    const data = {
      title: form.title,
      description: form.description || undefined,
      tipo: form.tipo,
      fase: form.fase,
      area: form.area,
      priority: (form.priority || undefined) as Item['priority'],
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      deadlineTime: form.deadlineTime || undefined,
      person: form.person || undefined,
      value: form.value ? parseFloat(form.value.replace(/\./g, '').replace(',', '.')) : undefined,
      tags: form.tags,
    };

    if (isNew) {
      addItem(data);
      toast.success('Item criado');
    } else if (id) {
      updateItem(id, data);
      toast.success('Item atualizado');
    }
    navigate('/items');
  };

  const handleDelete = () => {
    if (id && !isNew) {
      deleteItem(id);
      toast.success('Item removido');
      navigate('/items');
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !id || isNew) return;
    addComment(id, commentText.trim());
    setCommentText('');
    toast.success('Comentário adicionado');
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  if (!isNew && !existing) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Item não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/items')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const comments = existing?.comments || [];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">{isNew ? 'Novo Item' : 'Editar Item'}</h1>
      </div>

      <div className="space-y-3">
        {existing?.photoUrl && (
          <img src={existing.photoUrl} alt="" className="w-full h-40 object-cover rounded-xl" />
        )}
        <Input placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
        <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl min-h-[60px]" />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Tipo</label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{settings.tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Fase</label>
            <Select value={form.fase} onValueChange={v => setForm(f => ({ ...f, fase: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{settings.fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Área</label>
            <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Prioridade</label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="Sem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Data</label>
            <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="rounded-xl h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Hora (agenda)</label>
            <Input type="time" value={form.deadlineTime} onChange={e => setForm(f => ({ ...f, deadlineTime: e.target.value }))} className="rounded-xl h-9 text-xs" />
          </div>
        </div>

        <Input placeholder="Pessoa" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} className="rounded-xl h-9 text-xs" />

        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-medium">Valor R$</label>
          <Input
            placeholder="0,00"
            value={form.value}
            onChange={e => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              if (!raw) { setForm(f => ({ ...f, value: '' })); return; }
              const num = (parseInt(raw) / 100).toFixed(2);
              const formatted = parseFloat(num).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              setForm(f => ({ ...f, value: formatted }));
            }}
            className="rounded-xl h-9 text-xs"
          />
        </div>

        {/* Tag selection by group */}
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground font-medium">Tags</label>
          {settings.tagGroups.map(group => (
            <div key={group.name} className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{group.name}</p>
              <div className="flex flex-wrap gap-1">
                {group.tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full transition-colors border',
                      form.tags.includes(tag)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments / Activity Log */}
      {!isNew && (
        <div className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-foreground">Atualizações</label>
          <div className="flex gap-2">
            <Input
              placeholder="O que foi feito / próximo passo..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              className="rounded-xl h-9 text-xs flex-1"
            />
            <Button size="icon" variant="secondary" onClick={handleAddComment} className="rounded-xl h-9 w-9 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          {comments.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[...comments].reverse().map(c => (
                <div key={c.id} className="bg-muted/50 border border-border rounded-lg px-3 py-2 group relative">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{c.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(c.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <button
                    onClick={() => { if (id) deleteComment(id, c.id); }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Nenhuma atualização ainda.</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1 rounded-xl gap-1">
          <Save className="h-4 w-4" /> Salvar
        </Button>
        {!isNew && (
          <Button variant="destructive" size="icon" onClick={handleDelete} className="rounded-xl">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
