import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCentral } from '@/contexts/CentralContext';
import { REMINDER_OPTIONS, WEEKDAY_LABELS, Weekday } from '@/types/central';
import { toast } from 'sonner';
import { CalendarClock, Repeat } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRepeat?: boolean;
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AppointmentSheet({ open, onOpenChange, defaultRepeat = false }: Props) {
  const { settings, addItem, addRecurrence } = useCentral();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayYMD());
  const [time, setTime] = useState('09:00');
  const [area, setArea] = useState(settings.areas[0] || 'Pessoal');
  const [type, setType] = useState(settings.agendaTypes[0] || 'Compromisso');
  const [reminder, setReminder] = useState(30);
  const [repeat, setRepeat] = useState(defaultRepeat);
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDate(todayYMD());
      setTime('09:00');
      setArea(settings.areas[0] || 'Pessoal');
      setType(settings.agendaTypes[0] || 'Compromisso');
      setReminder(30);
      setRepeat(defaultRepeat);
      setWeekdays([]);
      setEndDate('');
    }
  }, [open, defaultRepeat, settings.areas, settings.agendaTypes]);

  const toggleDay = (d: Weekday) =>
    setWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort() as Weekday[]);

  const save = async () => {
    if (!title.trim()) { toast.error('Informe um título'); return; }
    setSaving(true);
    try {
      if (repeat) {
        if (weekdays.length === 0) { toast.error('Escolha ao menos um dia'); setSaving(false); return; }
        await addRecurrence({
          title: title.trim(),
          area,
          type,
          time,
          weekdays,
          startDate: date,
          endDate: endDate || undefined,
          reminderMinutes: reminder,
          active: true,
        });
        toast.success('Compromisso recorrente criado');
      } else {
        addItem({
          title: title.trim(),
          tipo: 'Compromisso',
          fase: 'Em andamento',
          area,
          deadline: date,
          deadlineTime: time,
          reminderMinutes: reminder,
          tags: [type],
        });
        toast.success('Compromisso criado');
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-t pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Novo compromisso
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Ex: Reunião com João"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="rounded-xl h-11"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Data</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Hora</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Área</label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.agendaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground">Lembrete</label>
            <Select value={String(reminder)} onValueChange={v => setReminder(Number(v))}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Repete</span>
            </div>
            <Switch checked={repeat} onCheckedChange={setRepeat} />
          </div>

          {repeat && (
            <div className="space-y-2 border border-border rounded-xl p-3">
              <label className="text-[11px] text-muted-foreground">Dias da semana</label>
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`h-9 w-9 rounded-full text-xs font-semibold border ${weekdays.includes(d.value) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Termina em (opcional)</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl h-11" />
              </div>
            </div>
          )}

          <Button className="w-full h-11" onClick={save} disabled={saving}>
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
