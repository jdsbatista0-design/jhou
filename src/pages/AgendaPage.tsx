import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useCentral, AgendaEntry } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { parseLocalDateTime } from '@/lib/dates';

export default function AgendaPage() {
  const { agendaEntries, addItem, updateItem, deleteEvent, settings } = useCentral();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', area: settings.areas[0], type: settings.agendaTypes[0] });
  const entryDate = (entry: AgendaEntry) => parseLocalDateTime(entry.datetime) || new Date(entry.datetime);

  const today = agendaEntries.filter(e => isToday(entryDate(e)));
  const tomorrow = agendaEntries.filter(e => isTomorrow(entryDate(e)));
  const week = agendaEntries.filter(e =>
    isThisWeek(entryDate(e), { weekStartsOn: 1 }) &&
    !isToday(entryDate(e)) &&
    !isTomorrow(entryDate(e))
  );
  const later = agendaEntries.filter(e =>
    !isToday(entryDate(e)) &&
    !isTomorrow(entryDate(e)) &&
    !isThisWeek(entryDate(e), { weekStartsOn: 1 })
  );

  const handleAdd = () => {
    if (!form.title.trim() || !form.date) { toast.error('Preencha título e data'); return; }
    // Cria como Item para que apareça em Items/Início também
    addItem({
      title: form.title.trim(),
      tipo: 'Ação',
      fase: 'Inbox',
      area: form.area,
      deadline: form.date,
      deadlineTime: form.time || undefined,
      tags: [form.type],
    });
    setForm({ title: '', date: '', time: '', area: settings.areas[0], type: settings.agendaTypes[0] });
    setOpen(false);
    toast.success('Compromisso criado como Item ✅');
  };

  const handleConclude = (entry: AgendaEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.source === 'item') {
      const isConcluido = entry.item?.fase === 'Concluído';
      updateItem(entry.sourceId, { fase: isConcluido ? 'Inbox' : 'Concluído' });
      toast.success(isConcluido ? 'Item reaberto' : 'Item concluído ✅');
    } else {
      deleteEvent(entry.sourceId);
      toast.success('Evento removido');
    }
  };

  const renderEntry = (entry: AgendaEntry) => {
    const isConcluido = entry.source === 'item' && entry.item?.fase === 'Concluído';
    return (
      <div
        key={entry.id}
        className={cn(
          "bg-card border border-border rounded-xl p-3 flex items-start justify-between cursor-pointer hover:border-primary/30 transition-colors",
          isConcluido && "opacity-60"
        )}
        onClick={() => entry.source === 'item' ? navigate(`/items/${entry.sourceId}`) : undefined}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => handleConclude(entry, e)}
            className={cn(
              "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
              isConcluido
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
            )}
            aria-label={isConcluido ? 'Reabrir' : 'Concluir'}
          >
            {isConcluido && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
          <div className="space-y-1 flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-foreground", isConcluido && "line-through")}>{entry.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(entryDate(entry), "HH:mm · EEEE, dd/MM", { locale: ptBR })} · {entry.type}
            </p>
            {entry.item && (
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="secondary" className="text-[9px]">{entry.item.area}</Badge>
                <Badge variant="outline" className="text-[9px]">{entry.item.fase}</Badge>
                {entry.item.person && <Badge variant="outline" className="text-[9px]">👤 {entry.item.person}</Badge>}
              </div>
            )}
            <Badge variant={entry.source === 'item' ? 'secondary' : 'outline'} className="text-[9px] mt-1">
              {entry.source === 'item' ? '📋 Item' : '📅 Evento'}
            </Badge>
          </div>
        </div>
        {entry.source === 'event' && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={e => { e.stopPropagation(); deleteEvent(entry.sourceId); toast.success('Evento removido'); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

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
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Compromisso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Novo Compromisso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl" />
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="rounded-xl" />
              </div>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>{settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>{settings.agendaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Cria um Item com data — aparece também em Items e Início.
              </p>
              <Button onClick={handleAdd} className="w-full rounded-xl">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Items com data aparecem aqui automaticamente. Tudo criado na agenda também vira Item.
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
