import { useState, useRef } from 'react';
import { Send, Camera, Mic, X, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';
import { cn } from '@/lib/utils';

export default function QuickInput() {
  const [text, setText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { addInboxEntry } = useCentral();

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && !photoPreview && !audioUrl) return;

    if (audioUrl) {
      addInboxEntry(trimmed || '🎙️ Áudio', 'audio', undefined, audioUrl);
    } else if (photoPreview) {
      addInboxEntry(trimmed || '📷 Foto', 'photo', photoPreview);
    } else {
      addInboxEntry(trimmed, 'text');
    }
    setText('');
    setPhotoPreview(null);
    setAudioUrl(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
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
      // Permission denied or not available
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-card border border-border rounded-2xl p-2 shadow-sm">
      {photoPreview && (
        <div className="relative mb-2 inline-block">
          <img src={photoPreview} alt="Preview" className="h-20 rounded-lg object-cover" />
          <button onClick={() => setPhotoPreview(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {audioUrl && (
        <div className="mb-2 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <span className="text-xs text-foreground">🎙️ Áudio gravado</span>
          <audio src={audioUrl} controls className="h-8 flex-1" />
          <button onClick={() => setAudioUrl(null)} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {isRecording && (
        <div className="mb-2 flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">Gravando {formatTime(recordingTime)}</span>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O que está na sua cabeça?"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[120px] py-2 px-1"
          style={{ overflow: 'auto' }}
        />
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" />
        </Button>
        {isRecording ? (
          <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shrink-0" onClick={stopRecording}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className={cn('h-8 w-8 shrink-0', audioUrl ? 'text-primary' : 'text-muted-foreground')} onClick={startRecording}>
            <Mic className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={handleSubmit} disabled={!text.trim() && !photoPreview && !audioUrl}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
