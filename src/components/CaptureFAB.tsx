import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Camera, Square, Send, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type Mode = 'text' | 'audio';

export default function CaptureFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressed = useRef(false);

  const { addInboxEntry } = useCentral();

  // Auto-focus textarea when sheet opens in text mode
  useEffect(() => {
    if (open && mode === 'text') {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  const reset = () => {
    setText('');
    setPhotoPreview(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed && !photoPreview && !audioUrl) return;

    if (audioUrl) {
      addInboxEntry(trimmed || '🎙️ Áudio', 'audio', undefined, audioUrl);
    } else if (photoPreview) {
      addInboxEntry(trimmed || '📷 Foto', 'photo', photoPreview);
    } else {
      addInboxEntry(trimmed, 'text');
    }
    reset();
    setOpen(false);
    toast({ title: 'Capturado ✓', description: 'IA vai organizar em segundos' });
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
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast({ title: 'Microfone bloqueado', description: 'Permita o acesso ao microfone' });
      setMode('text');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setOpen(true);
      setMode('text');
    };
    reader.readAsDataURL(file);
  };

  // Long-press FAB → instant audio mode
  const handlePressStart = () => {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setMode('audio');
      setOpen(true);
      startRecording();
    }, 350);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressed.current) {
      // Short tap → open text mode
      setMode('text');
      setOpen(true);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSheetChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      if (isRecording) stopRecording();
      reset();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      {/* Direct camera input (hidden) */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

      {/* FAB cluster */}
      <div className="fixed z-40 bottom-20 right-4 flex flex-col items-end gap-2">
        {/* Quick camera shortcut */}
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Foto rápida"
          className="h-11 w-11 rounded-full bg-card border border-border text-foreground shadow-md flex items-center justify-center active:scale-95 transition-transform"
        >
          <Camera className="h-4 w-4" />
        </button>

        {/* Main FAB: tap = text, long-press = audio */}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={() => longPressTimer.current && clearTimeout(longPressTimer.current)}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onContextMenu={e => e.preventDefault()}
          aria-label="Capturar (toque: texto, segure: áudio)"
          className={cn(
            'h-14 w-14 rounded-full',
            'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
            'flex items-center justify-center',
            'hover:scale-105 active:scale-95 transition-transform',
            'ring-4 ring-primary/10'
          )}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      <Sheet open={open} onOpenChange={handleSheetChange}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t pb-6 max-h-[80vh]">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="text-base flex items-center gap-2">
              <span>{mode === 'audio' ? '🎙️' : '⚡'}</span>
              {mode === 'audio' ? 'Gravando áudio' : 'Captura rápida'}
            </SheetTitle>
          </SheetHeader>

          {/* Audio mode: big record UI */}
          {mode === 'audio' ? (
            <div className="flex flex-col items-center gap-4 py-4">
              {isRecording ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                    <button
                      onClick={stopRecording}
                      className="relative h-24 w-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
                    >
                      <Square className="h-8 w-8" fill="currentColor" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</p>
                  <p className="text-xs text-muted-foreground">Toque para parar</p>
                </>
              ) : audioUrl ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                    <audio src={audioUrl} controls className="h-9 flex-1" />
                    <button onClick={() => { setAudioUrl(null); startRecording(); }} className="text-xs text-muted-foreground hover:text-foreground px-2">
                      Refazer
                    </button>
                  </div>
                  <Button onClick={submit} className="w-full h-11">
                    <Send className="h-4 w-4 mr-2" /> Enviar
                  </Button>
                </div>
              ) : (
                <Button onClick={startRecording} className="h-12">
                  <Mic className="h-4 w-4 mr-2" /> Iniciar gravação
                </Button>
              )}
            </div>
          ) : (
            // Text mode
            <div className="bg-card border border-border rounded-2xl p-2">
              {photoPreview && (
                <div className="relative mb-2 inline-block">
                  <img src={photoPreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                  <button onClick={() => setPhotoPreview(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="O que está na sua cabeça?"
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[160px] py-2 px-1"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={submit}
                  disabled={!text.trim() && !photoPreview}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            {mode === 'audio' ? 'Áudio será transcrito pela IA' : 'Toque rápido = texto · Segure o + = áudio · Câmera ao lado'}
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
