import { useRef, useState } from 'react';
import { Paperclip, X, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  value?: string;
  onChange: (path: string | undefined) => void;
  accept?: string;
}

const BUCKET = 'memory-attachments';

export default function AttachmentUploader({ value, onChange, accept = 'image/*,application/pdf' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sem sessão');
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      onChange(path);
      toast.success('Anexo enviado');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async () => {
    if (!value) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60);
    if (error || !data) return toast.error('Não foi possível abrir');
    setSignedUrl(data.signedUrl);
    window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {value ? (
        <>
          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1 flex-1" onClick={handleOpen}>
            <ExternalLink className="h-3.5 w-3.5" /> Ver anexo
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(undefined)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1 flex-1" onClick={handlePick} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? 'Enviando…' : 'Anexar arquivo'}
        </Button>
      )}
    </div>
  );
}
