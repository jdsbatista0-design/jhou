import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { Memory } from '@/types/central';

const todayISO = () => new Date().toISOString().slice(0, 10);

const WEEKDAYS = [
  { v: 1, l: 'S' }, { v: 2, l: 'T' }, { v: 3, l: 'Q' }, { v: 4, l: 'Q' },
  { v: 5, l: 'S' }, { v: 6, l: 'S' }, { v: 7, l: 'D' },
];

const emptyForm = {
  title: '',
  content: '',
  tags: '',
  weekdays: [] as number[],
  routineTime: '08:00',
};

export default function MemoryPage() {
  const {
    memories, ensureMemoriesLoaded, addMemory, updateMemory, deleteMemory,
    addRecurrence, settings,
  } = useCentral();

  useEffect(() => { ensureMemoriesLoaded(); }, [ensureMemoriesLoaded]);

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rotinas = useMemo(() => {
    const list = memories.filter(m => (m.category || 'geral') === 'rotina');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.content || '').toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.toLowerCase().includes(q)),
    );
  }, [memories, search]);

  const resetForm = () => { setEditingId(null); setForm(emptyForm); };

  const openEdit = (m: Memory) => {
    setEditingId(m.id);
    setForm({
      title: m.title || '',
      content: m.content || '',
      tags: (m.tags || []).join(', '),
      weekdays: m.weekdays || [],
      routineTime: m.routineTime || '08:00',
    });
    setOpen(true);
  };

  const toggleWeekday = (d: number) => {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d].sort(),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Título obrigatório'); return; }

    let linkedRecurrenceId: string | undefined;
    if (!editingId && form.weekdays.length > 0 && form.routineTime) {
      try {
        const recId = await addRecurrence({
          title: form.title,
          area: settings.areas[0] || 'Pessoal',
          type: 'Rotina',
          time: form.routineTime,
          weekdays: form.weekdays as any,
          startDate: todayISO(),
          reminderMinutes: 30,
          active: true,
        });
        if (recId) linkedRecurrenceId = recId;
      } catch (e) {
        console.error('addRecurrence failed', e);
      }
    }

    const payload: Partial<Memory> = {
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category: 'rotina',
      weekdays: form.weekdays,
      routineTime: form.routineTime,
    };
    if (linkedRecurrenceId) (payload as any).linkedRecurrenceId = linkedRecurrenceId;

    if (editingId) {
      await updateMemory(editingId, payload);
      toast.success('Rotina atualizada');
    } else {
      await addMemory(payload as any);
      toast.success('Rotina salva — aparece na Agenda');
    }
    resetForm();
    setOpen(false);
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Rotinas</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1" onClick={resetForm}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Editar rotina' : 'Nova rotina'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Nome da rotina (ex: Pilates)"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="rounded-xl"
              />
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Dias da semana</label>
                <div className="flex gap-1">
                  {WEEKDAYS.map(d => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleWeekday(d.v)}
                      className={`h-9 w-9 rounded-full text-xs font-semibold border ${form.weekdays.includes(d.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Horário</label>
                <Input
                  type="time"
                  value={form.routineTime}
                  onChange={e => setForm(f => ({ ...f, routineTime: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <Textarea
                placeholder="Observações"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="rounded-xl"
                rows={3}
              />
              <Input
                placeholder="Tags (vírgula)"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="rounded-xl text-xs"
              />
              <p className="text-[10px] text-muted-foreground">⏰ A rotina aparece automaticamente no calendário da Agenda.</p>
              <Button onClick={handleSave} className="w-full rounded-xl">{editingId ? 'Atualizar' : 'Salvar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar rotinas..." className="pl-9 h-9 rounded-xl" />
      </div>

      <div className="space-y-2">
        {rotinas.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-foreground truncate">{m.title}</h3>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)} aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { deleteMemory(m.id); toast.success('Removido'); }} aria-label="Excluir">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {(m.weekdays?.length || m.routineTime) && (
              <div className="flex flex-wrap gap-1">
                {m.routineTime && <Badge variant="outline" className="text-[10px]" data-mono>⏰ {m.routineTime}</Badge>}
                {(m.weekdays || []).map(d => (
                  <Badge key={d} variant="secondary" className="text-[10px]">{['S','T','Q','Q','S','S','D'][d - 1]}</Badge>
                ))}
                {m.linkedRecurrenceId && <Badge variant="outline" className="text-[10px]">na Agenda ✓</Badge>}
              </div>
            )}

            {m.content && (
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{m.content}</p>
            )}

            {m.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        ))}
      </div>

      {rotinas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">⏰</p>
          <p className="text-sm text-muted-foreground">Nenhuma rotina ainda.</p>
        </div>
      )}
    </div>
  );
}
