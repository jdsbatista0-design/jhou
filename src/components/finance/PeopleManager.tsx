import { useState, useMemo } from 'react';
import { Plus, Trash2, User as UserIcon } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PersonRole } from '@/types/finance';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ROLE_LABEL: Record<PersonRole, string> = {
  employee: 'Funcionário', supplier: 'Fornecedor', client: 'Cliente', other: 'Outro',
};

interface Props { companyId: string | null; }

export function PeopleManager({ companyId }: Props) {
  const { people, addPerson, deletePerson, companies } = useFinance();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PersonRole>('employee');
  const [doc, setDoc] = useState('');
  const [note, setNote] = useState('');

  const visible = useMemo(() => people.filter(p => {
    if (p.archived) return false;
    if (companyId === 'all') return true;
    return p.companyId === companyId;
  }), [people, companyId]);

  const canAdd = companyId && companyId !== 'all';

  const handleAdd = async () => {
    if (!name.trim()) { toast.error('Informe o nome'); return; }
    if (!canAdd) { toast.error('Selecione uma empresa específica'); return; }
    await addPerson({ companyId: companyId!, name: name.trim(), role, document: doc.trim() || undefined, note: note.trim() || undefined });
    setName(''); setDoc(''); setNote(''); setRole('employee');
    toast.success('Pessoa cadastrada');
  };

  return (
    <div className="space-y-3">
      {canAdd && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova pessoa</h3>
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" className="rounded-xl h-9 text-sm flex-1" />
            <Select value={role} onValueChange={v => setRole(v as PersonRole)}>
              <SelectTrigger className="rounded-xl h-9 text-sm w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input value={doc} onChange={e => setDoc(e.target.value)} placeholder="CPF/CNPJ (opcional)" className="rounded-xl h-9 text-sm" />
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (opcional)" className="rounded-xl h-9 text-sm" />
          <Button onClick={handleAdd} size="sm" className="w-full rounded-xl h-9">
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {canAdd ? 'Ninguém cadastrado ainda.' : 'Selecione uma empresa específica.'}
          </p>
        )}
        {visible.map(p => {
          const company = companies.find(c => c.id === p.companyId);
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {ROLE_LABEL[p.role]}{company ? ` · ${company.name}` : ''}{p.document ? ` · ${p.document}` : ''}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {p.name}?</AlertDialogTitle>
                    <AlertDialogDescription>Lançamentos vinculados perdem a referência da pessoa.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deletePerson(p.id); toast.success('Excluído'); }}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}
