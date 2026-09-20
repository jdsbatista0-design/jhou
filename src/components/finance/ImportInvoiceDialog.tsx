import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/types/finance';
import { toast } from 'sonner';
import { FileUp, Loader2, Check, X, CalendarClock } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; }

interface ParsedPurchase {
  description: string;
  amount: number;
  date: string | null;
  installmentNo: number | null;
  installmentTotal: number | null;
  category: string | null;
}

interface ParsedInvoice {
  bank: string | null;
  cardLast4: string | null;
  dueDate: string | null;
  closingDate: string | null;
  totalAmount: number;
  purchases: ParsedPurchase[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);

async function extractPdfText(file: File, password?: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf, password: password || undefined }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Reagrupa por linha para preservar "descrição ... valor"
    let lastY: number | null = null;
    let line = '';
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 2) { parts.push(line.trim()); line = ''; }
      line += `${item.str} `;
      lastY = y;
    }
    if (line.trim()) parts.push(line.trim());
  }
  return parts.filter(Boolean).join('\n');
}

export function ImportInvoiceDialog({ open, onClose }: Props) {
  const { cards, categories, transactions, updateCard } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [reading, setReading] = useState(false);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [cardId, setCardId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [generateFuture, setGenerateFuture] = useState(true);

  const activeCards = useMemo(() => cards.filter(c => !c.archived && c.scope === 'pf'), [cards]);
  const expenseCats = useMemo(() => categories.filter(c => !c.archived && c.kind === 'expense'), [categories]);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) s.add(`${t.cardId || ''}|${t.occurredOn}|${t.amount.toFixed(2)}|${norm(t.description)}`);
    return s;
  }, [transactions]);

  const reset = () => {
    setFile(null); setPassword(''); setParsed(null); setCardId(''); setDueDate('');
    setSkipped(new Set()); setReading(false); setSaving(false);
  };

  const close = () => { reset(); onClose(); };

  const handleRead = async () => {
    if (!file) return;
    setReading(true);
    try {
      const text = await extractPdfText(file, password);
      if (text.trim().length < 40) throw new Error('Esse PDF parece ser uma imagem escaneada — não consegui ler o texto.');

      const { data, error } = await supabase.functions.invoke('parse-invoice', {
        body: { text, categories: expenseCats.map(c => c.name) },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const inv = data as ParsedInvoice;
      if (!inv.purchases?.length) throw new Error('Não encontrei compras nesse arquivo.');
      setParsed(inv);
      setDueDate(inv.dueDate || '');

      // Tenta ligar ao cartão certo (por final ou pelo nome do banco)
      const guess = activeCards.find(c => inv.cardLast4 && c.name.includes(inv.cardLast4))
        || activeCards.find(c => inv.bank && norm(c.name).includes(norm(inv.bank).slice(0, 4)))
        || (activeCards.length === 1 ? activeCards[0] : undefined);
      if (guess) setCardId(guess.id);

      // Marca duplicados para não lançar de novo
      const dup = new Set<number>();
      inv.purchases.forEach((p, i) => {
        const key = `${guess?.id || ''}|${p.date}|${p.amount.toFixed(2)}|${norm(p.description)}`;
        if (existingKeys.has(key)) dup.add(i);
      });
      setSkipped(dup);
      if (dup.size) toast.info(`${dup.size} lançamento(s) já existem e foram desmarcados.`);
    } catch (e) {
      const msg = (e as Error).message || '';
      toast.error(/password|senha/i.test(msg) ? 'Senha do PDF incorreta ou necessária.' : msg || 'Não consegui ler o PDF.');
    } finally {
      setReading(false);
    }
  };

  const selected = useMemo(
    () => (parsed?.purchases || []).filter((_, i) => !skipped.has(i)),
    [parsed, skipped],
  );
  const selectedTotal = selected.reduce((s, p) => s + p.amount, 0);

  const fallbackDate = useMemo(() => {
    if (dueDate) { const [y, m] = dueDate.split('-'); return `${y}-${m}-01`; }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [dueDate]);

  const handleImport = async () => {
    if (!parsed || !cardId) { toast.error('Escolha o cartão desta fatura.'); return; }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Sessão expirada.');

      const catByName = new Map(expenseCats.map(c => [norm(c.name), c.id]));
      const rows: any[] = [];

      for (const p of selected) {
        const baseDate = p.date || fallbackDate;
        const categoryId = p.category ? catByName.get(norm(p.category)) || null : null;
        const total = p.installmentTotal && p.installmentTotal > 1 ? p.installmentTotal : null;
        const no = total ? Math.min(Math.max(p.installmentNo || 1, 1), total) : null;
        const groupId = total ? crypto.randomUUID() : null;
        const cleanDesc = p.description.replace(/\s*\(?\d{1,2}\s*\/\s*\d{1,2}\)?\s*$/, '').trim() || p.description;

        const makeRow = (dateISO: string, n: number | null, amount: number) => ({
          scope: 'pf', card_id: cardId, category_id: categoryId,
          kind: 'expense', amount,
          description: total ? `${cleanDesc} (${n}/${total})` : cleanDesc,
          occurred_on: dateISO, status: 'confirmed', source: 'sheet',
          notes: `Importado da fatura ${parsed.bank || ''}${dueDate ? ` · venc. ${dueDate}` : ''}`.trim(),
          user_id: userId,
          installment_no: n, installment_total: total, purchase_group_id: groupId,
        });

        rows.push(makeRow(baseDate, no, p.amount));

        // Parcelas futuras que ainda vão cair nas próximas faturas
        if (total && no && generateFuture && no < total) {
          const [y, m, d] = baseDate.split('-').map(Number);
          for (let k = 1; k <= total - no; k++) {
            const nd = new Date(y, m - 1 + k, d);
            const iso = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
            if (existingKeys.has(`${cardId}|${iso}|${p.amount.toFixed(2)}|${norm(cleanDesc)}`)) continue;
            rows.push(makeRow(iso, no + k, p.amount));
          }
        }
      }

      if (!rows.length) throw new Error('Nada selecionado para importar.');

      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('fin_transactions').insert(rows.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }

      // Guarda o dia de vencimento no cartão, se veio na fatura
      if (dueDate) {
        const day = Number(dueDate.split('-')[2]);
        const card = activeCards.find(c => c.id === cardId);
        if (card && day >= 1 && day <= 31 && card.dueDay !== day) await updateCard(cardId, { dueDay: day });
      }

      toast.success(`${rows.length} lançamento(s) importados na fatura.`);
      close();
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao importar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" /> Importar fatura (PDF)
          </DialogTitle>
        </DialogHeader>

        {!parsed && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Arquivo da fatura</Label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <Button variant="outline" className="w-full h-12 rounded-xl mt-1 justify-start" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-2" />
                <span className="truncate">{file ? file.name : 'Escolher PDF da fatura'}</span>
              </Button>
            </div>

            <div>
              <Label className="text-xs">Senha do PDF (se tiver)</Label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="ex.: primeiros dígitos do CPF"
                className="h-11 rounded-xl mt-1"
                autoComplete="off"
              />
            </div>

            <Button onClick={handleRead} disabled={!file || reading} className="w-full h-11 rounded-xl font-semibold">
              {reading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Lendo fatura…</> : 'Ler fatura'}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Leio as compras, parcelas e o vencimento. Nada é lançado antes de você conferir.
            </p>
          </div>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{parsed.bank || 'Fatura'}{parsed.cardLast4 ? ` · final ${parsed.cardLast4}` : ''}</span>
                <span className="font-bold tabular-nums">{formatBRL(parsed.totalAmount || selectedTotal)}</span>
              </div>
              <div>
                <Label className="text-xs">Cartão desta fatura</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Escolher cartão" /></SelectTrigger>
                  <SelectContent>
                    {activeCards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Vencimento</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl mt-1" />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={generateFuture} onChange={e => setGenerateFuture(e.target.checked)} />
                Lançar também as parcelas que ainda vão cair nas próximas faturas
              </label>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                {selected.length} de {parsed.purchases.length} compras
              </span>
              <span className="font-mono font-semibold">{formatBRL(selectedTotal)}</span>
            </div>

            <div className="space-y-1.5 max-h-[38vh] overflow-y-auto pr-0.5">
              {parsed.purchases.map((p, i) => {
                const off = skipped.has(i);
                return (
                  <button
                    key={`${p.description}-${i}`}
                    onClick={() => setSkipped(prev => {
                      const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
                    })}
                    className={`w-full text-left rounded-xl border p-2.5 flex items-start gap-2 transition-colors ${off ? 'border-border bg-muted/40 opacity-60' : 'border-primary/30 bg-primary/5'}`}
                  >
                    <span className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center shrink-0 ${off ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                      {off ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-foreground truncate">{p.description}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {p.date || 'sem data'}
                        {p.installmentTotal ? ` · parcela ${p.installmentNo || 1}/${p.installmentTotal}` : ''}
                        {p.category ? ` · ${p.category}` : ' · sem categoria'}
                      </span>
                    </span>
                    <span className="text-xs font-bold tabular-nums shrink-0">{formatBRL(p.amount)}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={reset} disabled={saving}>
                Trocar arquivo
              </Button>
              <Button className="flex-1 h-11 rounded-xl font-semibold" onClick={handleImport} disabled={saving || !cardId || !selected.length}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…</> : 'Importar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
