import { useState } from 'react';
import { Plus, X, Brain, ChevronDown } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TagGroup } from '@/types/central';

function EditableList({ label, items, onAdd, onRemove }: { label: string; items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void }) {
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
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
            {item}
            <button onClick={() => onRemove(item)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
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
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <X className="h-3.5 w-3.5" />
        </button>
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
              <span key={tag} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-[11px] px-2 py-0.5 rounded-full">
                {tag}
                <button onClick={() => onUpdate({ ...group, tags: group.tags.filter(t => t !== tag) })} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useCentral();
  const navigate = useNavigate();
  const [newGroupName, setNewGroupName] = useState('');

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
      />
      <EditableList
        label="Fases"
        items={settings.fases}
        onAdd={v => updateSettings({ fases: [...settings.fases, v] })}
        onRemove={v => updateSettings({ fases: settings.fases.filter(f => f !== v) })}
      />
      <EditableList
        label="Áreas"
        items={settings.areas}
        onAdd={v => updateSettings({ areas: [...settings.areas, v] })}
        onRemove={v => updateSettings({ areas: settings.areas.filter(a => a !== v) })}
      />

      {/* Tag Groups */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">🏷️ Tags (por grupo)</h3>
        {settings.tagGroups.map((group, idx) => (
          <TagGroupEditor
            key={group.name}
            group={group}
            onUpdate={g => {
              const updated = [...settings.tagGroups];
              updated[idx] = g;
              updateSettings({ tagGroups: updated });
            }}
            onDelete={() => updateSettings({ tagGroups: settings.tagGroups.filter((_, i) => i !== idx) })}
          />
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
      />
    </div>
  );
}
