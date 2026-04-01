import { useState } from 'react';
import { Plus, X, Brain } from 'lucide-react';
import { useCentral } from '@/contexts/CentralContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

export default function SettingsPage() {
  const { settings, updateSettings } = useCentral();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-foreground">Configurações</h1>

      <div className="space-y-2">
        <Button variant="outline" className="w-full rounded-xl justify-start gap-2" onClick={() => navigate('/memory')}>
          <Brain className="h-4 w-4" /> Memória / HD
        </Button>
        <Button variant="outline" className="w-full rounded-xl justify-start gap-2" onClick={() => navigate('/reports')}>
          📊 Relatórios e Direção
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
      <EditableList
        label="Tags"
        items={settings.tags}
        onAdd={v => updateSettings({ tags: [...settings.tags, v] })}
        onRemove={v => updateSettings({ tags: settings.tags.filter(t => t !== v) })}
      />
      <EditableList
        label="Tipos de Agenda"
        items={settings.agendaTypes}
        onAdd={v => updateSettings({ agendaTypes: [...settings.agendaTypes, v] })}
        onRemove={v => updateSettings({ agendaTypes: settings.agendaTypes.filter(t => t !== v) })}
      />
    </div>
  );
}
