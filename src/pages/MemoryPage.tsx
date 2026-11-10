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

  const groups = useMemo(() => {
    const sorted = [...rotinas].sort((a, b) => (a.routineTime || '99').localeCompare(b.routineTime || '99'));
    const g = [
      { label: 'Manhã', items: sorted.filter(m => (m.routineTime || '') < '12:00' && m.routineTime) },
      { label: 'Tarde', items: sorted.filter(m => (m.routineTime || '') >= '12:00' && (m.routineTime || '') < '18:00') },
      { label: 'Noite', items: sorted.filter(m => (m.routineTime || '') >= '18:00') },
      { label: 'Sem horário', items: sorted.filter(m => !m.routineTime) },
    ];
    return g.filter(x => x.items.length);
  }, [rotinas]);
  const DAY = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Rotinas</h1>
        <p className="text-sm text-muted-foreground">Toque numa rotina para editar. Elas aparecem sozinhas no Hoje.</p>
      </div>

      {rotinas.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar" className="pl-9 h-11 rounded-2xl" />
        </div>
      )}

      {groups.map(g => (
        <section key={g.label} className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{g.label}</h2>
          {g.items.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 pr-2">
              <button className="flex-1 min-w-0 text-left" onClick={() => openEdit(m)} aria-label={`Editar ${m.title}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold" data-mono>{m.routineTime || '--:--'}</span>
                  <span className="font-semibold truncate">{m.title}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <span key={d} className={`h-6 w-6 rounded-full text-[11px] font-bold flex items-center justify-center ${(m.weekdays || []).includes(d) ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground'}`}>{DAY[d - 1]}</span>
                  ))}
                </div>
              </button>
              <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground" aria-label={`Excluir ${m.title}`}
                onClick={() => { if (confirm(`Excluir a rotina "${m.title}"?`)) { deleteMemory(m.id); toast.success('Rotina excluída'); } }}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </section>
      ))}

      {rotinas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma rotina ainda. Crie a primeira, como "Pilates seg e qua 7h".</p>
        </div>
      )}

      <button onClick={() => { resetForm(); setOpen(true); }} aria-label="Nova rotina"
        className="fixed right-5 z-40 h-14 pl-5 pr-6 rounded-full bg-primary text-primary-foreground shadow-panel flex items-center gap-2 font-semibold"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        <Plus className="h-5 w-5" />Rotina
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-display">{editingId ? 'Editar rotina' : 'Nova rotina'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input autoFocus placeholder="Nome (ex: Pilates)" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-2xl h-12" />
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Dias</label>
              <div className="flex justify-between">
                {WEEKDAYS.map(d => (
                  <button key={d.v} type="button" onClick={() => toggleWeekday(d.v)}
                    className={`h-11 w-11 rounded-full text-sm font-semibold border ${form.weekdays.includes(d.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Horário</label>
              <Input type="time" value={form.routineTime} onChange={e => setForm(f => ({ ...f, routineTime: e.target.value }))} className="rounded-2xl h-12" />
            </div>
            <Textarea placeholder="Observação (opcional)" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="rounded-2xl" rows={2} />
            <Button onClick={handleSave} className="w-full rounded-2xl h-12 font-semibold">{editingId ? 'Salvar' : 'Criar rotina'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
