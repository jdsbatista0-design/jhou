import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCentral, AgendaEntry } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AgendaPage() {
  const { agendaEntries, addEvent, deleteEvent, settings } = useCentral();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', datetime: '', type: settings.agendaTypes[0] });

  const today = agendaEntries.filter(e => isToday(new Date(e.datetime)));
  const tomorrow = agendaEntries.filter(e => isTomorrow(new Date(e.datetime)));
  const week = agendaEntries.filter(e =>
    isThisWeek(new Date(e.datetime), { weekStartsOn: 1 }) &&
    !isToday(new Date(e.datetime)) &&
    !isTomorrow(new Date(e.datetime))
  );
  const later = agendaEntries.filter(e =>
    !isToday(new Date(e.datetime)) &&
    !isTomorrow(new Date(e.datetime)) &&
    !isThisWeek(new Date(e.datetime), { weekStartsOn: 1 })
  );

  const handleAdd = () => {
    if (!form.title.trim() || !form.datetime) { toast.error('Preencha título e data/hora'); return; }
    addEvent({
      title: form.title,
      datetime: new Date(form.datetime).toISOString(),
      type: form.type,
    });
    setForm({ title: '', datetime: '', type: settings.agendaTypes[0] });
    setOpen(false);
    toast.success('Evento criado');
  };

  const renderEntry = (entry: AgendaEntry) => (
    <div
      key={entry.id}
      className="bg-card border border-border rounded-xl p-3 flex items-start justify-between cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => entry.source === 'item' ? navigate(`/items/${entry.sourceId}`) : undefined}
    >
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium text-foreground">{entry.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {format(new Date(entry.datetime), "HH:mm · EEEE, dd/MM", { locale: ptBR })} · {entry.type}
        </p>
        {entry.item && (
          <div className="flex gap-1 mt-1">
            <Badge variant="secondary" className="text-[9px]">{entry.item.area}</Badge>
            <Badge variant="outline" className="text-[9px]">{entry.item.fase}</Badge>
            {entry.item.person && <Badge variant="outline" className="text-[9px]">👤 {entry.item.person}</Badge>}
          </div>
        )}
        <Badge variant={entry.source === 'item' ? 'secondary' : 'outline'} className="text-[9px] mt-1">
          {entry.source === 'item' ? '📋 Item' : '📅 Evento'}
        </Badge>
      </div>
      {entry.source === 'event' && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={e => { e.stopPropagation(); deleteEvent(entry.sourceId); toast.success('Evento removido'); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const renderGroup = (label: string, list: AgendaEntry[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h2>
        {list.map(renderEntry)}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Agenda</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Evento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Novo Evento Avulso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <Input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} className="rounded-xl" />
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{settings.agendaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleAdd} className="w-full rounded-xl">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Items com data aparecem automaticamente aqui. Eventos avulsos podem ser criados separadamente.
      </p>

      {renderGroup('Hoje', today)}
      {renderGroup('Amanhã', tomorrow)}
      {renderGroup('Esta semana', week)}
      {renderGroup('Próximos', later)}

      {agendaEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm text-muted-foreground">Nada na agenda. Items com data aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
