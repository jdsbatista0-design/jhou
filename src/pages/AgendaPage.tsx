import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AgendaPage() {
  const { events, addEvent, deleteEvent, settings, items } = useCentral();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', datetime: '', type: settings.agendaTypes[0], linkedItemId: '' });

  const sorted = [...events].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const today = sorted.filter(e => isToday(new Date(e.datetime)));
  const tomorrow = sorted.filter(e => isTomorrow(new Date(e.datetime)));
  const week = sorted.filter(e => isThisWeek(new Date(e.datetime), { weekStartsOn: 1 }) && !isToday(new Date(e.datetime)) && !isTomorrow(new Date(e.datetime)));
  const later = sorted.filter(e => !isToday(new Date(e.datetime)) && !isTomorrow(new Date(e.datetime)) && !isThisWeek(new Date(e.datetime), { weekStartsOn: 1 }));

  const handleAdd = () => {
    if (!form.title.trim() || !form.datetime) { toast.error('Preencha título e data/hora'); return; }
    addEvent({
      title: form.title,
      datetime: new Date(form.datetime).toISOString(),
      type: form.type,
      linkedItemId: form.linkedItemId || undefined,
    });
    setForm({ title: '', datetime: '', type: settings.agendaTypes[0], linkedItemId: '' });
    setOpen(false);
    toast.success('Evento criado');
  };

  const renderGroup = (label: string, list: typeof events) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h2>
        {list.map(e => (
          <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{e.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {format(new Date(e.datetime), "HH:mm · EEEE, dd/MM", { locale: ptBR })} · {e.type}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { deleteEvent(e.id); toast.success('Evento removido'); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Agenda</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <Input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} className="rounded-xl" />
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{settings.agendaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {items.length > 0 && (
                <Select value={form.linkedItemId} onValueChange={v => setForm(f => ({ ...f, linkedItemId: v }))}>
                  <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Vincular a item (opcional)" /></SelectTrigger>
                  <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Button onClick={handleAdd} className="w-full rounded-xl">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {renderGroup('Hoje', today)}
      {renderGroup('Amanhã', tomorrow)}
      {renderGroup('Esta semana', week)}
      {renderGroup('Próximos', later)}

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm text-muted-foreground">Nenhum evento na agenda.</p>
        </div>
      )}
    </div>
  );
}
