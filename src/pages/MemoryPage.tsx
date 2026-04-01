import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MemoryPage() {
  const { memories, addMemory, deleteMemory } = useCentral();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const filtered = memories.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error('Título obrigatório'); return; }
    addMemory({
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setForm({ title: '', content: '', tags: '' });
    setOpen(false);
    toast.success('Memória salva');
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Memória / HD</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Nova Memória</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <Textarea placeholder="Conteúdo" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Tags (vírgula)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="rounded-xl text-xs" />
              <Button onClick={handleAdd} className="w-full rounded-xl">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar memórias..." className="pl-9 h-9 rounded-xl" />
      </div>

      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-foreground">{m.title}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { deleteMemory(m.id); toast.success('Removido'); }}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            {m.content && <p className="text-xs text-muted-foreground line-clamp-3">{m.content}</p>}
            {m.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🧠</p>
          <p className="text-sm text-muted-foreground">Nenhuma memória ainda.</p>
        </div>
      )}
    </div>
  );
}
