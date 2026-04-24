import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CategoryKind, FinScope } from '@/types/finance';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const KIND_LABEL: Record<CategoryKind, string> = {
  income: 'Entrada', expense: 'Saída', transfer: 'Transferência',
};

const COLORS = ['#10b981','#22c55e','#ef4444','#f97316','#a855f7','#ec4899','#3b82f6','#06b6d4','#eab308','#8b5cf6','#dc2626','#0ea5e9','#64748b','#f43f5e','#475569','#94a3b8'];

interface Props { scope: FinScope; }

export function CategoriesManager({ scope }: Props) {
  const { categories, addCategory, deleteCategory } = useFinance();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [color, setColor] = useState(COLORS[0]);

  const visible = categories.filter(c => c.scope === scope && !c.archived).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'income' ? -1 : a.kind === 'expense' ? (b.kind === 'income' ? 1 : -1) : 1;
    return a.name.localeCompare(b.name);
  });

  const handleAdd = async () => {
    if (!name.trim()) { toast.error('Informe o nome'); return; }
    await addCategory({ scope, name: name.trim(), kind, color });
    setName(''); setColor(COLORS[0]);
    toast.success('Categoria criada');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova categoria</h3>
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" className="rounded-xl h-9 text-sm flex-1" />
          <Select value={kind} onValueChange={v => setKind(v as CategoryKind)}>
            <SelectTrigger className="rounded-xl h-9 text-sm w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Entrada</SelectItem>
              <SelectItem value="expense">Saída</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full border-2"
              style={{ background: c, borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent' }} />
          ))}
        </div>
        <Button onClick={handleAdd} size="sm" className="w-full rounded-xl h-9">
          <Plus className="h-3.5 w-3.5 mr-1" /> Criar
        </Button>
      </div>

      <div className="space-y-2">
        {visible.map(c => (
          <div key={c.id} className="rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: c.color + '22' }}>
              <Tag className="h-3.5 w-3.5" style={{ color: c.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{KIND_LABEL[c.kind]}</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                  <AlertDialogDescription>Lançamentos com essa categoria ficam sem categoria.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deleteCategory(c.id); toast.success('Excluída'); }}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
