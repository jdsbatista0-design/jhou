import { useState } from 'react';
import { Plus, Search, Trash2, Eye, EyeOff, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { MemoryCategory, MEMORY_CATEGORIES } from '@/types/central';

export default function MemoryPage() {
  const { memories, addMemory, deleteMemory } = useCentral();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', tags: '', category: 'geral' as MemoryCategory,
    login: '', password: '', url: '', city: '',
  });
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const filtered = memories.filter(m => {
    const matchSearch = !search || 
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      (m.city && m.city.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = activeCategory === 'all' || m.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error('Título obrigatório'); return; }
    addMemory({
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category: form.category,
      login: form.login || undefined,
      password: form.password || undefined,
      url: form.url || undefined,
      city: form.city || undefined,
    });
    setForm({ title: '', content: '', tags: '', category: form.category, login: '', password: '', url: '', city: '' });
    setOpen(false);
    toast.success('Memória salva');
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getCategoryFields = () => {
    switch (form.category) {
      case 'senhas':
        return (
          <>
            <Input placeholder="Login / email" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} className="rounded-xl" />
            <Input placeholder="Senha" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="rounded-xl" />
            <Input placeholder="URL do site/sistema" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="rounded-xl" />
          </>
        );
      case 'viagens':
        return (
          <Input placeholder="Cidade" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="rounded-xl" />
        );
      default:
        return null;
    }
  };

  const renderCard = (m: typeof memories[0]) => {
    const cat = m.category || 'geral';
    const catInfo = MEMORY_CATEGORIES.find(c => c.value === cat);

    return (
      <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm flex-shrink-0">{catInfo?.icon}</span>
            <h3 className="text-sm font-medium text-foreground truncate">{m.title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { deleteMemory(m.id); toast.success('Removido'); }}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        {/* Senhas - special rendering */}
        {cat === 'senhas' && (
          <div className="space-y-1 bg-muted/50 rounded-lg p-2">
            {m.login && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Login:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-foreground">{m.login}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(m.login!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {m.password && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Senha:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-foreground">
                    {visiblePasswords.has(m.id) ? m.password : '••••••••'}
                  </span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => togglePassword(m.id)}>
                    {visiblePasswords.has(m.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(m.password!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {m.url && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">URL:</span>
                <a href={m.url.startsWith('http') ? m.url : `https://${m.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                  {m.url.replace(/^https?:\/\//, '').slice(0, 30)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Viagens - city badge */}
        {cat === 'viagens' && m.city && (
          <Badge variant="outline" className="text-[10px]">📍 {m.city}</Badge>
        )}

        {/* Content */}
        {m.content && <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{m.content}</p>}

        {/* Tags */}
        {m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {m.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    );
  };

  // Group by city for viagens
  const renderViagensGrouped = () => {
    if (activeCategory !== 'viagens') return filtered.map(renderCard);
    const cities = new Map<string, typeof filtered>();
    filtered.forEach(m => {
      const city = m.city || 'Sem cidade';
      if (!cities.has(city)) cities.set(city, []);
      cities.get(city)!.push(m);
    });
    return Array.from(cities.entries()).map(([city, items]) => (
      <div key={city} className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          📍 {city} <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </h3>
        {items.map(renderCard)}
      </div>
    ));
  };

  const categoryCount = (cat: MemoryCategory) => memories.filter(m => (m.category || 'geral') === cat).length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Memória / HD</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1"><Plus className="h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Memória</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as MemoryCategory }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              {getCategoryFields()}
              <Textarea placeholder="Conteúdo / Notas" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="rounded-xl" rows={4} />
              <Input placeholder="Tags (vírgula)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="rounded-xl text-xs" />
              <Button onClick={handleAdd} className="w-full rounded-xl">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <Button
          size="sm"
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="rounded-full text-xs h-8 flex-shrink-0"
          onClick={() => setActiveCategory('all')}
        >
          Tudo ({memories.length})
        </Button>
        {MEMORY_CATEGORIES.map(c => {
          const count = categoryCount(c.value);
          return (
            <Button
              key={c.value}
              size="sm"
              variant={activeCategory === c.value ? 'default' : 'outline'}
              className="rounded-full text-xs h-8 flex-shrink-0 gap-1"
              onClick={() => { setActiveCategory(c.value); setForm(f => ({ ...f, category: c.value })); }}
            >
              {c.icon} {c.label} {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar memórias..." className="pl-9 h-9 rounded-xl" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        {activeCategory === 'viagens' ? renderViagensGrouped() : filtered.map(renderCard)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">
            {activeCategory === 'all' ? '🧠' : MEMORY_CATEGORIES.find(c => c.value === activeCategory)?.icon || '🧠'}
          </p>
          <p className="text-sm text-muted-foreground">
            {activeCategory === 'all' ? 'Nenhuma memória ainda.' : `Nenhuma memória em ${MEMORY_CATEGORIES.find(c => c.value === activeCategory)?.label}.`}
          </p>
        </div>
      )}
    </div>
  );
}
