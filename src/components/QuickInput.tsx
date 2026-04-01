import { useState, useRef } from 'react';
import { Send, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentral } from '@/contexts/CentralContext';

export default function QuickInput() {
  const [text, setText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addInboxEntry } = useCentral();

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && !photoPreview) return;
    if (photoPreview) {
      addInboxEntry(trimmed || 'Foto', 'photo', photoPreview);
    } else {
      addInboxEntry(trimmed, 'text');
    }
    setText('');
    setPhotoPreview(null);
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
      <div className="flex items-end gap-2">
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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleSubmit} disabled={!text.trim() && !photoPreview}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
