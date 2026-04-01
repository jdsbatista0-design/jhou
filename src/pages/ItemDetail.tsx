import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCentral } from '@/contexts/CentralContext';
import { Item } from '@/types/central';
import { toast } from 'sonner';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, settings, addItem, updateItem, deleteItem } = useCentral();
  const isNew = id === 'new';
  const existing = !isNew ? items.find(i => i.id === id) : null;

  const [form, setForm] = useState({
    title: '',
    description: '',
    tipo: settings.tipos[0],
    fase: settings.fases[0],
    area: settings.areas[0],
    priority: '' as string,
    deadline: '',
    person: '',
    asset: '',
    value: '',
    tags: '',
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
        person: existing.person || '',
        asset: existing.asset || '',
        value: existing.value?.toString() || '',
        tags: existing.tags.join(', '),
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
      person: form.person || undefined,
      asset: form.asset || undefined,
      value: form.value ? parseFloat(form.value) : undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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

  if (!isNew && !existing) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Item não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/items')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">{isNew ? 'Novo Item' : 'Editar Item'}</h1>
      </div>

      <div className="space-y-3">
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
          <Input type="date" placeholder="Prazo" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="rounded-xl h-9 text-xs" />
          <Input placeholder="Pessoa" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} className="rounded-xl h-9 text-xs" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Ativo (imóvel, empresa...)" value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} className="rounded-xl h-9 text-xs" />
          <Input type="number" placeholder="Valor R$" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="rounded-xl h-9 text-xs" />
        </div>

        <Input placeholder="Tags (separadas por vírgula)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="rounded-xl h-9 text-xs" />
      </div>

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
