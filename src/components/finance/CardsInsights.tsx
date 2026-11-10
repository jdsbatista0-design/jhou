import { lazy, Suspense, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL, type FinTransaction } from '@/types/finance';
import {
  splitStatement, endingInstallments, rankBy, recurringMerchants, normalizeMerchant, shiftMonth, monthLabel, isInstallment,
} from '@/lib/cardInsights';
import { cn } from '@/lib/utils';

const TransactionDialog = lazy(() => import('@/components/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })));

const Section = ({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-slip">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </section>
);

const Delta = ({ pct }: { pct: number | null }) => {
  if (pct === null || Math.abs(pct) < 5) return null;
  const up = pct > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold', up ? 'text-accent' : 'text-primary')}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{pct.toFixed(0)}%
    </span>
  );
};

export function CardsInsights() {
  const { cards, categories, getCardStatement } = useFinance();
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinTransaction | null>(null);
  const active = useMemo(() => cards.filter(c => !c.archived && c.scope === 'pf'), [cards]);
  const nowISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const catName = useMemo(() => new Map(categories.map(c => [c.id, { name: c.name, color: c.color }])), [categories]);

  const data = useMemo(() => {
    const stmt = (iso: string) => active.map(c => ({ card: c, st: getCardStatement(c.id, iso) }));

    // Próximos 6 meses
    const upcoming = Array.from({ length: 6 }, (_, i) => {
      const iso = shiftMonth(nowISO, i);
      const per = stmt(iso);
      const txs = per.flatMap(p => p.st.transactions);
      const split = splitStatement(txs);
      return {
        iso, txs, per,
        total: per.reduce((s, p) => s + p.st.total, 0),
        paid: per.reduce((s, p) => s + p.st.paid, 0),
        remaining: per.reduce((s, p) => s + p.st.remaining, 0),
        due: per.map(p => p.st.due).filter(Boolean).sort()[0] as string | undefined,
        ...split,
      };
    });

    // Parcelas mês a mês até a última
    const installments: { iso: string; amount: number; ending: FinTransaction[] }[] = [];
    for (let i = 0; i < 36; i++) {
      const iso = shiftMonth(nowISO, i);
      const txs = stmt(iso).flatMap(p => p.st.transactions).filter(isInstallment);
      if (!txs.length && i > 0) break;
      installments.push({ iso, amount: txs.reduce((s, t) => s + t.amount, 0), ending: endingInstallments(txs) });
    }

    // Últimos 3 vs 3 anteriores (faturas fechadas)
    const window = (from: number) => Array.from({ length: 3 }, (_, i) => {
      const iso = shiftMonth(nowISO, from - i);
      return { monthISO: iso, txs: stmt(iso).flatMap(p => p.st.transactions) };
    });
    const last3 = window(-1), prev3 = window(-4);
    const flat = (w: typeof last3) => w.flatMap(m => m.txs);
    const topCats = rankBy(flat(last3), flat(prev3), t => t.categoryId ?? 'none', t => t.amount, 3);
    const topMerch = rankBy(flat(last3).filter(t => !isInstallment(t)), flat(prev3).filter(t => !isInstallment(t)),
      t => normalizeMerchant(t.description), t => t.amount, 3);
    const recurring = recurringMerchants(window(-1).concat(window(-4)), 3).slice(0, 6);
    const avgStatement = last3.reduce((s, m) => s + m.txs.reduce((a, t) => a + t.amount, 0), 0) / 3;

    // Alertas
    const alerts: string[] = [];
    for (const c of active) {
      if (!c.limitAmount) continue;
      const used = upcoming.reduce((s, m) => s + (m.per.find(p => p.card.id === c.id)?.st.remaining ?? 0), 0);
      const pct = (used / c.limitAmount) * 100;
      if (pct >= 70) alerts.push(`${c.name}: ${pct.toFixed(0)}% do limite comprometido (${formatBRL(used)} de ${formatBRL(c.limitAmount)}).`);
    }
    if (avgStatement > 0 && upcoming[0].total > avgStatement * 1.15)
      alerts.push(`A fatura de ${monthLabel(nowISO)} está ${(((upcoming[0].total / avgStatement) - 1) * 100).toFixed(0)}% acima da sua média (${formatBRL(avgStatement)}).`);
    const uncategorized = upcoming.flatMap(m => m.txs).concat(flat(last3)).filter(t => !t.categoryId).length;
    if (uncategorized) alerts.push(`${uncategorized} compras sem categoria — toque nelas para classificar e a análise ficar certa.`);

    return { upcoming, installments, topCats, topMerch, recurring, alerts, avgStatement };
  }, [active, getCardStatement, nowISO]);

  if (!active.length) {
    return <p className="text-xs text-muted-foreground text-center py-6">Cadastre um cartão para ver a gestão.</p>;
  }

  const maxUp = Math.max(1, ...data.upcoming.map(m => m.total));
  const maxInst = Math.max(1, ...data.installments.map(m => m.amount));
  const fmtDay = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

  return (
    <div className="space-y-3">
      {data.alerts.length > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 space-y-1.5">
          {data.alerts.map(a => (
            <p key={a} className="text-xs text-foreground flex gap-2"><AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />{a}</p>
          ))}
        </div>
      )}

      <Section title="Faturas dos próximos meses" hint="toque para ver as compras">
        <div className="space-y-1.5">
          {data.upcoming.map((m, i) => {
            const open = openMonth === m.iso;
            return (
              <div key={m.iso} className={cn('rounded-xl', i === 0 && 'bg-primary/5 ring-1 ring-primary/20')}>
                <button onClick={() => setOpenMonth(open ? null : m.iso)} className="w-full text-left p-2.5 space-y-1.5" disabled={!m.total}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{monthLabel(m.iso)}{m.due && <span className="text-muted-foreground font-normal"> · vence {fmtDay(m.due)}</span>}</span>
                    <span className="text-sm font-bold tabular-nums flex items-center gap-1">{formatBRL(m.total)}
                      {m.total > 0 && <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: `${(m.installments / maxUp) * 100}%` }} />
                    <div className="h-full bg-accent/70" style={{ width: `${(m.purchases / maxUp) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>Parcelas {formatBRL(m.installments)} · Compras {formatBRL(m.purchases)}</span>
                    {i === 0 && m.total > 0 && <span>Pago {formatBRL(m.paid)} · falta {formatBRL(m.remaining)}</span>}
                  </div>
                </button>
                {open && (
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/60 pt-2">
                    {m.per.filter(p => p.st.total > 0).map(p => (
                      <div key={p.card.id} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold"><span>{p.card.name}</span><span className="tabular-nums">{formatBRL(p.st.total)}</span></div>
                        {[...p.st.transactions].sort((a, b) => b.amount - a.amount).map(t => (
                          <button key={t.id} onClick={() => setEditing(t)} className="w-full flex justify-between text-[11px] text-muted-foreground py-0.5 hover:text-foreground">
                            <span className="truncate text-left">{t.description}</span>
                            <span className="tabular-nums shrink-0 ml-2">{formatBRL(t.amount)}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Parcelas já assumidas</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent/70" />Compras do mês</span>
        </div>
      </Section>

      {data.installments.some(m => m.amount > 0) && (
        <Section title="Parcelas mês a mês" hint={`até ${monthLabel(data.installments[data.installments.length - 1].iso)}`}>
          <div className="flex items-end gap-1 h-28">
            {data.installments.map(m => (
              <div key={m.iso} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${(m.amount / maxInst) * 100}%` }} title={formatBRL(m.amount)} />
                <span className="text-[8px] text-muted-foreground mt-1 truncate w-full text-center">{monthLabel(m.iso).split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {data.installments.filter(m => m.ending.length).slice(0, 6).map(m => {
              const freed = m.ending.reduce((s, t) => s + t.amount, 0);
              return (
                <div key={m.iso} className="flex justify-between text-xs">
                  <span className="text-foreground"><span className="font-semibold">{monthLabel(m.iso)}</span> · última de {m.ending.length} {m.ending.length === 1 ? 'parcela' : 'parcelas'}
                    <span className="block text-[10px] text-muted-foreground truncate max-w-[220px]">{m.ending.map(t => normalizeMerchant(t.description)).join(', ')}</span>
                  </span>
                  <span className="text-primary font-semibold tabular-nums shrink-0">libera {formatBRL(freed)}/mês</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {data.topCats.length > 0 && (
        <Section title="Onde mais gasto" hint="últimas 3 faturas">
          <div className="space-y-2">
            {data.topCats.map(c => {
              const meta = catName.get(c.key) ?? { name: 'Sem categoria', color: 'hsl(var(--muted-foreground))' };
              return (
                <div key={c.key} className="space-y-1">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="font-medium flex items-center gap-1.5 truncate"><span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.color }} />{meta.name}</span>
                    <span className="tabular-nums flex items-center gap-2 shrink-0"><Delta pct={c.deltaPct} />{formatBRL(c.avg)}/mês</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full" style={{ width: `${(c.total / data.topCats[0].total) * 100}%`, background: meta.color }} /></div>
                </div>
              );
            })}
          </div>
          {data.topMerch.length > 0 && (
            <div className="pt-2 border-t border-border/60 space-y-1">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Estabelecimentos</p>
              {data.topMerch.map(m => (
                <div key={m.key} className="flex justify-between text-xs gap-2">
                  <span className="truncate capitalize">{m.key.toLowerCase()}</span>
                  <span className="tabular-nums flex items-center gap-2 shrink-0"><Delta pct={m.deltaPct} />{formatBRL(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {data.recurring.length > 0 && (
        <Section title="Cobranças que se repetem" hint="candidatas a corte">
          {data.recurring.map(r => (
            <div key={r.name} className="flex justify-between text-xs gap-2">
              <span className="flex items-center gap-1.5 truncate capitalize"><Repeat className="h-3 w-3 text-muted-foreground shrink-0" />{r.name.toLowerCase()}</span>
              <span className="tabular-nums shrink-0 text-right">{formatBRL(r.monthly)}/mês<span className="block text-[10px] text-muted-foreground">{formatBRL(r.yearly)}/ano</span></span>
            </div>
          ))}
        </Section>
      )}

      {editing && (
        <Suspense fallback={null}>
          <TransactionDialog open onClose={() => setEditing(null)} scope="pf" companyId={null} editTransaction={editing} />
        </Suspense>
      )}
    </div>
  );
}
