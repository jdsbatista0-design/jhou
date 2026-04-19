import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Camera, Square, Send, X, Type } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type Mode = 'menu' | 'text' | 'audio';

export default function CaptureFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
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

  const { addInboxEntry } = useCentral();

  // Auto-focus textarea
  useEffect(() => {
    if (open && mode === 'text') {
      const t = setTimeout(() => textareaRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  const reset = () => {
    setText('');
    setPhotoPreview(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const closeAll = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    reset();
    setMode('menu');
    setOpen(false);
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
    toast({ title: 'Capturado ✓', description: 'IA vai organizar em segundos' });
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
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      toast({
        title: 'Microfone bloqueado',
        description: 'Permita o acesso ao microfone nas configurações do navegador',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting same file
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setMode('text');
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const openMenu = () => {
    setMode('menu');
    setOpen(true);
  };

  const pickAudio = () => {
    setMode('audio');
    // start recording immediately
    setTimeout(() => startRecording(), 100);
  };

  const pickText = () => setMode('text');

  const pickPhoto = () => fileRef.current?.click();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSheetChange = (v: boolean) => {
    if (!v) closeAll();
    else setOpen(true);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
      />

      {/* Single FAB */}
      <button
        onClick={openMenu}
        aria-label="Capturar"
        className={cn(
          'fixed z-40 bottom-20 right-4 h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg shadow-primary/40',
          'flex items-center justify-center',
          'active:scale-95 transition-transform',
          'ring-4 ring-primary/10'
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={open} onOpenChange={handleSheetChange}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t pb-8 max-h-[85vh]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-base flex items-center gap-2">
              {mode === 'audio' && <><span>🎙️</span> Áudio</>}
              {mode === 'text' && <><span>⚡</span> Captura rápida</>}
              {mode === 'menu' && <><span>✨</span> O que você quer capturar?</>}
            </SheetTitle>
          </SheetHeader>

          {/* MENU: 3 grandes botões */}
          {mode === 'menu' && (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={pickText}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary active:scale-95 transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Type className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">Texto</span>
              </button>

              <button
                onClick={pickAudio}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary active:scale-95 transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-xs font-medium text-foreground">Áudio</span>
              </button>

              <button
                onClick={pickPhoto}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary active:scale-95 transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                  <Camera className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground">Foto</span>
              </button>
            </div>
          )}

          {/* AUDIO mode */}
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
                  <p className="text-2xl font-bold tabular-nums text-destructive">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">Toque para parar</p>
                </>
              ) : audioUrl ? (
                <div className="w-full space-y-4">
                  <div className="bg-muted rounded-xl px-3 py-3">
                    <audio src={audioUrl} controls className="w-full h-10" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAudioUrl(null);
                        startRecording();
                      }}
                      className="flex-1 h-11"
                    >
                      Refazer
                    </Button>
                    <Button onClick={submit} className="flex-1 h-11">
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

          {/* TEXT mode */}
          {mode === 'text' && (
            <div className="space-y-3">
              {photoPreview && (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-24 rounded-xl object-cover"
                  />
                  <button
                    onClick={() => setPhotoPreview(null)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="bg-card border border-border rounded-2xl p-3">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Reunião com João amanhã às 14h sobre projeto X"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[72px] max-h-[200px]"
                />
              </div>
              <Button
                onClick={submit}
                className="w-full h-11"
                disabled={!text.trim() && !photoPreview}
              >
                <Send className="h-4 w-4 mr-2" /> Enviar para IA
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                A IA vai detectar tipo, área, data e prioridade
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
