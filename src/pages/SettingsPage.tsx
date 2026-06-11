import { useState, useEffect } from 'react';
import { Plus, X, Brain, ChevronDown, ArrowUp, ArrowDown, RefreshCw, Wifi, WifiOff, LogOut, Pencil, Check } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TagGroup } from '@/types/central';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { GoogleCalendarCard } from '@/components/GoogleCalendarCard';
// RecurrencesManager moved to AgendaPage (tab "Recorrências")

function reorder<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const next = [...arr];
  const target = idx + dir;
  if (target < 0 || target >= next.length) return next;
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}

function EditableList({
  label,
  items,
  onAdd,
  onRemove,
  onReorder,
}: {
  label: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  onReorder: (next: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const handleAdd = () => {
    const v = input.trim();
    if (!v) return;
    if (items.includes(v)) { toast.error('Já existe'); return; }
    onAdd(v);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Novo ${label.toLowerCase()}`} className="rounded-xl h-8 text-xs flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <Button size="sm" variant="outline" onClick={handleAdd} className="rounded-xl h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
            <span className="text-xs text-foreground flex-1 truncate">{item}</span>
            <button
              onClick={() => onReorder(reorder(items, idx, -1))}
              disabled={idx === 0}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Mover para cima"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onReorder(reorder(items, idx, 1))}
              disabled={idx === items.length - 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Mover para baixo"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1 text-muted-foreground hover:text-destructive" aria-label="Excluir">
                  <X className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir "{item}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove "{item}" de {label}. Items existentes que usam este valor continuarão com ele, mas você não poderá selecioná-lo em novos cadastros.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemove(item)}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagGroupEditor({ group, onUpdate, onDelete }: { group: TagGroup; onUpdate: (g: TagGroup) => void; onDelete: () => void }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);

  const handleAddTag = () => {
    const v = input.trim();
    if (!v) return;
    if (group.tags.includes(v)) { toast.error('Tag já existe neste grupo'); return; }
    onUpdate({ ...group, tags: [...group.tags, v] });
    setInput('');
  };

  const handleSaveName = () => {
    const v = nameInput.trim();
    if (!v) return;
    onUpdate({ ...group, name: v });
    setEditingName(false);
  };

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground">
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        </button>
        {editingName ? (
          <Input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            className="h-7 text-sm font-semibold rounded-lg flex-1"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-foreground flex-1 text-left">
            {group.name}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground">{group.tags.length}</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-muted-foreground hover:text-destructive" aria-label="Excluir grupo">
              <X className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir grupo "{group.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as {group.tags.length} tags deste grupo serão removidas das opções disponíveis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {open && (
        <>
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Nova tag" className="rounded-xl h-7 text-xs flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
            <Button size="sm" variant="outline" onClick={handleAddTag} className="rounded-xl h-7 px-2"><Plus className="h-3 w-3" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map(tag => (
              <TagChip
                key={tag}
                tag={tag}
                onRename={(newTag) => {
                  const trimmed = newTag.trim();
                  if (!trimmed || trimmed === tag) return;
                  if (group.tags.includes(trimmed)) { toast.error('Tag já existe neste grupo'); return; }
                  onUpdate({ ...group, tags: group.tags.map(t => t === tag ? trimmed : t) });
                }}
                onDelete={() => onUpdate({ ...group, tags: group.tags.filter(t => t !== tag) })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TagChip({ tag, onRename, onDelete }: { tag: string; onRename: (v: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tag);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== tag) onRename(value.trim());
    else setValue(tag);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 bg-card border border-primary text-foreground text-[11px] px-2 py-0.5 rounded-full">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setValue(tag); setEditing(false); }
          }}
          className="bg-transparent outline-none w-20 text-[11px]"
        />
        <button onMouseDown={e => { e.preventDefault(); commit(); }} className="text-primary">
          <Check className="h-2.5 w-2.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-[11px] px-2 py-0.5 rounded-full group">
      {tag}
      <button onClick={() => setEditing(true)} className="hover:text-foreground" aria-label="Renomear tag">
        <Pencil className="h-2.5 w-2.5" />
      </button>
      <button onClick={onDelete} className="hover:text-destructive" aria-label="Excluir tag">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useCentral();
  const navigate = useNavigate();
  const [newGroupName, setNewGroupName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [profile, setProfile] = useState<{ email?: string; full_name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
      else setProfile({ email: user.email });
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Saiu da conta');
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada — faça login novamente');

      // Force re-upsert das settings + leitura
      const { error: upErr } = await (supabase as any)
        .from('app_settings')
        .upsert(
          { key: 'central_settings', value: settings, user_id: user.id },
          { onConflict: 'user_id,key' }
        );
      if (upErr) throw upErr;

      const { error: readErr } = await (supabase as any)
        .from('app_settings')
        .select('value')
        .eq('key', 'central_settings')
        .eq('user_id', user.id)
        .maybeSingle();
      if (readErr) throw readErr;

      setLastSync(new Date());
      toast.success('Sincronizado com a nuvem ✅');
    } catch (e: any) {
      toast.error('Erro ao sincronizar: ' + (e?.message || 'desconhecido'));
    } finally {
      setSyncing(false);
    }
  };

  const handleAddGroup = () => {
    const v = newGroupName.trim();
    if (!v) return;
    if (settings.tagGroups.some(g => g.name === v)) { toast.error('Grupo já existe'); return; }
    updateSettings({ tagGroups: [...settings.tagGroups, { name: v, tags: [] }] });
    setNewGroupName('');
  };

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-foreground">Configurações</h1>

      {/* Conta */}
      {profile && (
        <div className="border border-border rounded-xl p-3 flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
              {(profile.full_name || profile.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile.full_name || 'Conta Google'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-8 gap-1"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs">Sair</span>
          </Button>
        </div>
      )}

      <GoogleCalendarCard />


      {/* Sync status */}
      <div className="border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi className="h-4 w-4 text-primary" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            <div>
              <p className="text-xs font-medium text-foreground">
                {online ? 'Conectado à nuvem' : 'Sem conexão'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {lastSync
                  ? `Última sincronização: ${lastSync.toLocaleTimeString('pt-BR')}`
                  : 'Sincronização automática ativa entre PC e celular'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-8 gap-1"
            onClick={handleSyncNow}
            disabled={syncing || !online}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            <span className="text-xs">Sincronizar</span>
          </Button>
        </div>
      </div>

      <RecurrencesManager />

      <div className="space-y-2">
        <Button variant="outline" className="w-full rounded-xl justify-start gap-2" onClick={() => navigate('/memory')}>
          <Brain className="h-4 w-4" /> Memória / HD
        </Button>
      </div>

      <EditableList
        label="Tipos"
        items={settings.tipos}
        onAdd={v => updateSettings({ tipos: [...settings.tipos, v] })}
        onRemove={v => updateSettings({ tipos: settings.tipos.filter(t => t !== v) })}
        onReorder={next => updateSettings({ tipos: next })}
      />
      <EditableList
        label="Fases"
        items={settings.fases}
        onAdd={v => updateSettings({ fases: [...settings.fases, v] })}
        onRemove={v => updateSettings({ fases: settings.fases.filter(f => f !== v) })}
        onReorder={next => updateSettings({ fases: next })}
      />
      <EditableList
        label="Áreas"
        items={settings.areas}
        onAdd={v => updateSettings({ areas: [...settings.areas, v] })}
        onRemove={v => updateSettings({ areas: settings.areas.filter(a => a !== v) })}
        onReorder={next => updateSettings({ areas: next })}
      />

      {/* Tag Groups */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">🏷️ Tags (por grupo)</h3>
        {settings.tagGroups.map((group, idx) => (
          <div key={group.name} className="space-y-1">
            <div className="flex justify-end gap-1">
              <button
                onClick={() => updateSettings({ tagGroups: reorder(settings.tagGroups, idx, -1) })}
                disabled={idx === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Mover grupo para cima"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => updateSettings({ tagGroups: reorder(settings.tagGroups, idx, 1) })}
                disabled={idx === settings.tagGroups.length - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Mover grupo para baixo"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <TagGroupEditor
              group={group}
              onUpdate={g => {
                const updated = [...settings.tagGroups];
                updated[idx] = g;
                updateSettings({ tagGroups: updated });
              }}
              onDelete={() => updateSettings({ tagGroups: settings.tagGroups.filter((_, i) => i !== idx) })}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Novo grupo de tags" className="rounded-xl h-8 text-xs flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
          <Button size="sm" variant="outline" onClick={handleAddGroup} className="rounded-xl h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <EditableList
        label="Tipos de Agenda"
        items={settings.agendaTypes}
        onAdd={v => updateSettings({ agendaTypes: [...settings.agendaTypes, v] })}
        onRemove={v => updateSettings({ agendaTypes: settings.agendaTypes.filter(t => t !== v) })}
        onReorder={next => updateSettings({ agendaTypes: next })}
      />
    </div>
  );
}
