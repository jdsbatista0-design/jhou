import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Square, Send, StickyNote, ListChecks, ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCentral } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AppointmentSheet from '@/components/AppointmentSheet';

// Rotas onde o FAB de captura NÃO deve aparecer (elas possuem seus próprios CTAs)
const HIDDEN_ROUTES = ['/financas', '/memory', '/memoria'];

type Mode = 'item' | 'note' | 'audio';

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CaptureFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('item');
  const [appointmentOpen, setAppointmentOpen] = useState(false);

  // Quick item form
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<string>(todayYMD());
  const [deadlineTime, setDeadlineTime] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [fase, setFase] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [person, setPerson] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Note & audio
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { addInboxEntry, addItem, settings } = useCentral();
  const navigate = useNavigate();
  const location = useLocation();
  const hidden = HIDDEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(`${r}/`));
  const onAgenda = location.pathname === '/agenda' || location.pathname.startsWith('/agenda/');

  // Initialize defaults from settings when they arrive
  useEffect(() => {
    if (!area && settings.areas.length) setArea(settings.areas[0]);
    if (!fase && settings.fases.length) {
      // Prefer "Em andamento" if exists, else first non-Concluído
      const preferred = settings.fases.find(f => /andamento/i.test(f)) || settings.fases.find(f => f !== 'Concluído') || settings.fases[0];
      setFase(preferred);
    }
  }, [settings.areas, settings.fases, area, fase]);

  // Auto-focus
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (mode === 'item') titleRef.current?.focus();
      if (mode === 'note') textareaRef.current?.focus();
    }, 180);
    return () => clearTimeout(t);
  }, [open, mode]);

  const resetForm = () => {
    setTitle('');
    setDeadline(todayYMD());
    setDeadlineTime('');
    setPriority('');
    setPerson('');
    setText('');
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const closeAll = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    resetForm();
    setMode('item');
    setOpen(false);
  };

  const saveItem = async () => {
    const t = title.trim();
    if (!t) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await addItem({
        title: t,
        tipo: settings.tipos[0] || 'Ação',
        fase: fase || settings.fases[0],
        area: area || settings.areas[0],
        priority: (priority || undefined) as any,
        deadline: deadline || undefined,
        deadlineTime: deadlineTime || undefined,
        person: person || undefined,
        tags: [],
      } as any);
      toast({ title: 'Item criado ✓', description: deadline ? `Prazo ${deadline}${deadlineTime ? ' ' + deadlineTime : ''}` : 'Sem prazo' });
      closeAll();
    } finally {
      setSaving(false);
    }
  };

  const openFullEditor = () => {
    closeAll();
    navigate('/items/new');
  };

  const submitNote = () => {
    const trimmed = text.trim();
    if (!trimmed && !audioUrl) return;
    if (audioUrl) {
      addInboxEntry(trimmed || '🎙️ Áudio', 'audio', undefined, audioUrl);
    } else {
      addInboxEntry(trimmed, 'text');
    }
    toast({ title: 'Salvo no Inbox ✓' });
    closeAll();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      toast({ title: 'Microfone bloqueado', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFabClick = () => {
    if (onAgenda) { setAppointmentOpen(true); return; }
    setMode('item');
    setOpen(true);
  };

  const handleSheetChange = (v: boolean) => {
    if (!v) closeAll();
    else setOpen(true);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const setPrazoRel = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  return (
    <>
      {!hidden && (
        <button
          onClick={handleFabClick}
          aria-label={onAgenda ? 'Novo compromisso' : 'Novo item'}
          className={cn(
            'fixed z-40 right-4 h-14 w-14 rounded-full',
            'bg-primary text-primary-foreground shadow-lg shadow-primary/40',
            'flex items-center justify-center',
            'active:scale-95 transition-transform',
            'ring-4 ring-primary/10'
          )}
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 12px)' }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      )}

      <Sheet open={open} onOpenChange={handleSheetChange}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t pb-8 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="text-left mb-3">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-base">
                {mode === 'item' && 'Novo item'}
                {mode === 'note' && 'Nota rápida'}
                {mode === 'audio' && 'Áudio'}
              </SheetTitle>
              <div className="flex gap-1 bg-muted rounded-full p-0.5 text-[11px]">
                <button
                  onClick={() => setMode('item')}
                  className={cn('px-2.5 h-7 rounded-full inline-flex items-center gap-1', mode === 'item' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  <ListChecks className="h-3 w-3" /> Item
                </button>
                <button
                  onClick={() => setMode('note')}
                  className={cn('px-2.5 h-7 rounded-full inline-flex items-center gap-1', mode === 'note' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  <StickyNote className="h-3 w-3" /> Nota
                </button>
                <button
                  onClick={() => setMode('audio')}
                  className={cn('px-2.5 h-7 rounded-full inline-flex items-center gap-1', mode === 'audio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  <Mic className="h-3 w-3" /> Áudio
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* ITEM: quick launch com prazo + área */}
          {mode === 'item' && (
            <div className="space-y-3">
              <Input
                ref={titleRef}
                placeholder="O que precisa ser feito?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveItem(); }}
                className="rounded-xl h-11 text-sm"
              />

              {/* Chips de prazo */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { l: 'Hoje', d: 0 },
                  { l: 'Amanhã', d: 1 },
                  { l: '+3d', d: 3 },
                  { l: '+7d', d: 7 },
                  { l: 'Sem', d: -1 },
                ].map(opt => (
                  <button
                    key={opt.l}
                    type="button"
                    onClick={() => opt.d < 0 ? setDeadline('') : setPrazoRel(opt.d)}
                    className={cn(
                      'text-[11px] px-2.5 h-7 rounded-full border transition-colors',
                      (opt.d < 0 ? !deadline : deadline === (() => {
                        const dd = new Date(); dd.setDate(dd.getDate() + opt.d);
                        return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
                      })())
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-transparent'
                    )}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Data</label>
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="rounded-xl h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Hora</label>
                  <Input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="rounded-xl h-9 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Área</label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{settings.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fase</label>
                  <Select value={fase} onValueChange={setFase}>
                    <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{settings.fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Prioridade</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="Sem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Pessoa</label>
                  <Input placeholder="(opcional)" value={person} onChange={e => setPerson(e.target.value)} className="rounded-xl h-9 text-xs" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveItem} disabled={saving || !title.trim()} className="flex-1 h-11 rounded-xl">
                  <Send className="h-4 w-4 mr-2" /> {saving ? 'Salvando…' : 'Criar item'}
                </Button>
                <Button variant="outline" onClick={openFullEditor} className="h-11 rounded-xl px-3" aria-label="Abrir editor completo">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Enter salva. Toque na seta para tags, descrição e mais.
              </p>
            </div>
          )}

          {/* NOTE: captura rápida no Inbox */}
          {mode === 'note' && (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-2xl p-3">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNote(); } }}
                  placeholder="Anotação rápida para triar depois…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[72px] max-h-[200px]"
                />
              </div>
              <Button onClick={submitNote} className="w-full h-11 rounded-xl" disabled={!text.trim()}>
                <Send className="h-4 w-4 mr-2" /> Salvar no Inbox
              </Button>
            </div>
          )}

          {/* AUDIO */}
          {mode === 'audio' && (
            <div className="flex flex-col items-center gap-5 py-6">
              {isRecording ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                    <button
                      onClick={stopRecording}
                      className="relative h-28 w-28 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                    >
                      <Square className="h-9 w-9" fill="currentColor" />
                    </button>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-destructive">{formatTime(recordingTime)}</p>
                  <p className="text-xs text-muted-foreground">Toque para parar</p>
                </>
              ) : audioUrl ? (
                <div className="w-full space-y-4">
                  <div className="bg-muted rounded-xl px-3 py-3">
                    <audio src={audioUrl} controls className="w-full h-10" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setAudioUrl(null); startRecording(); }} className="flex-1 h-11">Refazer</Button>
                    <Button onClick={submitNote} className="flex-1 h-11">
                      <Send className="h-4 w-4 mr-2" /> Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={startRecording}
                    className="h-28 w-28 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  >
                    <Mic className="h-10 w-10" />
                  </button>
                  <p className="text-xs text-muted-foreground">Toque para gravar</p>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AppointmentSheet open={appointmentOpen} onOpenChange={setAppointmentOpen} />
    </>
  );
}
