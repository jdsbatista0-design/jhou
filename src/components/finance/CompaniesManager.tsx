import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Building2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COLOR_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

export function CompaniesManager() {
  const { companies, addCompany, updateCompany, deleteCompany } = useFinance();
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PALETTE[0]);

  const handleAdd = async () => {
    const n = name.trim();
    if (!n) { toast.error('Informe o nome da empresa'); return; }
    await addCompany({ name: n, cnpj: cnpj.trim() || undefined, color });
    setName(''); setCnpj(''); setColor(COLOR_PALETTE[0]);
    toast.success('Empresa cadastrada');
  };

  const startEdit = (c: any) => {
    setEditingId(c.id); setEditName(c.name); setEditCnpj(c.cnpj || ''); setEditColor(c.color);
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) { toast.error('Nome obrigatório'); return; }
    await updateCompany(id, { name: editName.trim(), cnpj: editCnpj.trim() || undefined, color: editColor });
    setEditingId(null); toast.success('Empresa atualizada');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova empresa</h3>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da empresa" className="rounded-xl h-9 text-sm" />
        <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="CNPJ (opcional)" className="rounded-xl h-9 text-sm" />
        <div className="flex items-center gap-1.5">
          {COLOR_PALETTE.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent' }} />
          ))}
        </div>
        <Button onClick={handleAdd} size="sm" className="w-full rounded-xl h-9">
          <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar
        </Button>
      </div>

      <div className="space-y-2">
        {companies.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma empresa cadastrada.</p>
        )}
        {companies.map(c => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
            {editingId === c.id ? (
              <div className="space-y-2">
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl h-8 text-sm" />
                <Input value={editCnpj} onChange={e => setEditCnpj(e.target.value)} placeholder="CNPJ" className="rounded-xl h-8 text-sm" />
                <div className="flex items-center gap-1.5">
                  {COLOR_PALETTE.map(col => (
                    <button key={col} onClick={() => setEditColor(col)}
                      className="h-5 w-5 rounded-full border-2"
                      style={{ background: col, borderColor: editColor === col ? 'hsl(var(--foreground))' : 'transparent' }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(c.id)} className="rounded-xl h-8 flex-1"><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-xl h-8 flex-1"><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: c.color + '22' }}>
                  <Building2 className="h-4 w-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                  {c.cnpj && <div className="text-[11px] text-muted-foreground">{c.cnpj}</div>}
                </div>
                <button onClick={() => startEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {c.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todas as contas, cartões e lançamentos vinculados a essa empresa serão removidos. Não dá pra desfazer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteCompany(c.id); toast.success('Empresa excluída'); }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
