import { useMemo, useState } from 'react';
import { Plus, Trash2, Check, Repeat, Bell, CalendarDays, List } from 'lucide-react';
import { useCentral, AgendaEntry } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, isSameDay, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AgendaCalendar from '@/components/agenda/AgendaCalendar';
import { parseLocalDateTime } from '@/lib/dates';
import { REMINDER_OPTIONS, WEEKDAY_LABELS, Weekday } from '@/types/central';

export default function AgendaPage() {
  const { agendaEntries, addItem, addRecurrence, updateItem, deleteEvent, settings } = useCentral();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    area: settings.areas[0],
    type: settings.agendaTypes[0],
    repeat: false,
    weekdays: [] as Weekday[],
    endDate: '',
    reminderMinutes: 30,
  });
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

  const resetForm = () => setForm({
    title: '', date: '', time: '', area: settings.areas[0], type: settings.agendaTypes[0],
    repeat: false, weekdays: [], endDate: '', reminderMinutes: 30,
  });

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Preencha o título'); return; }

    if (form.repeat) {
      if (form.weekdays.length === 0) { toast.error('Escolha ao menos 1 dia da semana'); return; }
      if (!form.time) { toast.error('Escolha um horário'); return; }
      await addRecurrence({
        title: form.title.trim(),
        area: form.area,
        type: form.type,
        time: form.time,
        weekdays: form.weekdays,
        startDate: form.date || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || undefined,
        reminderMinutes: form.reminderMinutes,
        active: true,
      });
      toast.success('Recorrência criada — ocorrências geradas na agenda 🔁');
    } else {
      if (!form.date) { toast.error('Preencha a data'); return; }
      addItem({
        title: form.title.trim(),
        tipo: 'Ação',
        fase: 'Inbox',
        area: form.area,
        deadline: form.date,
        deadlineTime: form.time || undefined,
        tags: [form.type],
        reminderMinutes: form.reminderMinutes,
      });
      toast.success('Compromisso criado ✅');
    }
    resetForm();
    setOpen(false);
  };

  const toggleWeekday = (d: Weekday) => {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d],
    }));
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
                {entry.item.recurrenceId && (
                  <Badge variant="outline" className="text-[9px] gap-0.5"><Repeat className="h-2.5 w-2.5" /> recorrente</Badge>
                )}
                {entry.item.reminderMinutes && (
                  <Badge variant="outline" className="text-[9px] gap-0.5"><Bell className="h-2.5 w-2.5" /> {entry.item.reminderMinutes}min</Badge>
                )}
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
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Compromisso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título (ex: Pilates)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />

              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="repeat" className="text-sm cursor-pointer">Repete toda semana</Label>
                </div>
                <Switch id="repeat" checked={form.repeat} onCheckedChange={v => setForm(f => ({ ...f, repeat: v }))} />
              </div>

              {form.repeat ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Dias da semana</Label>
                    <div className="flex gap-1 justify-between">
                      {WEEKDAY_LABELS.map(w => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => toggleWeekday(w.value)}
                          className={cn(
                            'h-9 w-9 rounded-full text-xs font-semibold border transition-colors',
                            form.weekdays.includes(w.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                          )}
                          aria-label={w.long}
                        >
                          {w.short}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Hora</Label>
                      <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Termina em (opcional)</Label>
                      <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="rounded-xl" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl" />
                  <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="rounded-xl" />
                </div>
              )}

              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>{settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>{settings.agendaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Bell className="h-3 w-3" /> Lembrete</Label>
                <Select value={String(form.reminderMinutes)} onValueChange={v => setForm(f => ({ ...f, reminderMinutes: Number(v) }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Notificações no celular requerem ativar push em Configurações (próxima etapa).
                </p>
              </div>

              <Button onClick={handleAdd} className="w-full rounded-xl">
                {form.repeat ? 'Criar recorrência' : 'Criar compromisso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Items com data aparecem aqui automaticamente. Compromissos recorrentes geram ocorrências dos próximos 60 dias.
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
