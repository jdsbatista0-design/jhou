import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatBRL } from '@/types/finance';
import { ChevronDown, AlertTriangle, Repeat, Scissors, TrendingDown, CalendarClock } from 'lucide-react';

const PERIODS = [3, 6, 12] as const;
type Period = typeof PERIODS[number];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-3 ${className}`}>{children}</div>;
}

function SectionTitle({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon} {children}
      </span>
      {right}
    </div>
  );
}

export function SavingsInsights() {
  const {
    categories, getCategoryTrends, getRecurringMerchants, getInstallmentOutlook,
    getUncategorized, updateTransaction,
  } = useFinance();

  const [period, setPeriod] = useState<Period>(3);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [cut, setCut] = useState(10);
  const [fixing, setFixing] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const trends = useMemo(() => getCategoryTrends(period), [getCategoryTrends, period]);
  const recurring = useMemo(() => getRecurringMerchants(Math.max(period, 6)), [getRecurringMerchants, period]);
  const outlook = useMemo(() => getInstallmentOutlook(6), [getInstallmentOutlook]);
  const uncat = useMemo(() => getUncategorized(), [getUncategorized]);

  const expenseCats = categories.filter(c => c.kind === 'expense' && !c.archived);
  const totalPeriod = trends.reduce((s, r) => s + r.total, 0);
  const avgMonth = totalPeriod / period;
  const maxOutlook = Math.max(...outlook.perMonth.map(m => m.total), 1);

  // Candidatos a corte: top categorias, exceto fixas essenciais
  const ESSENTIAL = /moradia|saúde|plano|imposto|educa/i;
  const cutCandidates = trends.filter(r => !ESSENTIAL.test(r.name) && r.avgMonth > 50).slice(0, 5);
  const cutSaving = cutCandidates.reduce((s, r) => s + r.avgMonth * (cut / 100), 0);

  const assign = async (txId: string, categoryId: string) => {
    setAssigning(txId);
    await updateTransaction(txId, { categoryId });
    setAssigning(null);
  };

  return (
    <div className="space-y-3">
      {/* Período */}
      <div className="flex items-center gap-1.5">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-colors ${
              period === p
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card text-muted-foreground border-border'
            }`}
          >
            {p} meses
          </button>
        ))}
      </div>

      {/* Resumo */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-4">
        <div className="text-[11px] uppercase tracking-wider opacity-90">Gasto médio por mês</div>
        <div className="text-2xl font-bold">{formatBRL(avgMonth)}</div>
        <div className="text-[11px] opacity-80 mt-1">
          {formatBRL(totalPeriod)} nos últimos {period} meses
        </div>
      </div>

      {/* Dados sem categoria */}
      {uncat.count > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <SectionTitle
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            right={
              <button
                onClick={() => setFixing(f => !f)}
                className="text-[11px] font-semibold text-primary"
              >
                {fixing ? 'Fechar' : 'Ajustar'}
              </button>
            }
          >
            {uncat.count} gastos sem categoria · {formatBRL(uncat.total)}
          </SectionTitle>
          <p className="text-[11px] text-muted-foreground">
            Enquanto estiverem sem categoria, a análise fica incompleta.
          </p>
          {fixing && (
            <div className="mt-2 space-y-2">
              {uncat.transactions.slice(0, 20).map(t => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate">{t.description}</span>
                    <span className="text-xs font-mono font-semibold shrink-0">{formatBRL(t.amount)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-1.5">
                    {t.occurredOn.split('-').reverse().join('/')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {expenseCats.map(c => (
                      <button
                        key={c.id}
                        disabled={assigning === t.id}
                        onClick={() => assign(t.id, c.id)}
                        className="h-7 px-2 rounded-lg border border-border text-[10.5px] text-foreground disabled:opacity-40"
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full mr-1" style={{ background: c.color }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Gasto por categoria */}
      <Card>
        <SectionTitle icon={<TrendingDown className="h-3.5 w-3.5" />}>
          Gasto por categoria
        </SectionTitle>
        <div className="space-y-2.5">
          {trends.map(r => {
            const key = r.categoryId || 'none';
            const open = openCat === key;
            return (
              <div key={key}>
                <button onClick={() => setOpenCat(open ? null : key)} className="w-full text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="text-foreground truncate">{r.name}</span>
                      {r.deltaPct !== null && Math.abs(r.deltaPct) >= 5 && (
                        <span className={`text-[10px] shrink-0 ${r.deltaPct > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                          {r.deltaPct > 0 ? '↑' : '↓'}{Math.abs(r.deltaPct).toFixed(0)}%
                        </span>
                      )}
                      {r.overBudget && (
                        <span className="text-[10px] text-destructive shrink-0">meta estourada</span>
                      )}
                    </span>
                    <span className="text-right shrink-0 ml-2">
                      <span className="font-mono font-semibold text-foreground">{formatBRL(r.avgMonth)}</span>
                      <span className="text-[9.5px] text-muted-foreground">/mês</span>
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                    <div className="h-full" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>{r.pct.toFixed(0)}% do total</span>
                    <span>{formatBRL(r.total)} em {period}m</span>
                  </div>
                </button>
                {open && r.topTransactions.length > 0 && (
                  <div className="mt-1.5 space-y-1 pl-3.5 border-l border-border">
                    {r.topTransactions.map(t => (
                      <div key={t.id} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground truncate">{t.description}</span>
                        <span className="font-mono text-foreground shrink-0 ml-2">{formatBRL(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {trends.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Nenhum gasto no período.</p>
          )}
        </div>
      </Card>

      {/* Gastos repetidos */}
      <Card>
        <SectionTitle icon={<Repeat className="h-3.5 w-3.5" />}>
          Se repete todo mês · candidatos a corte
        </SectionTitle>
        <div className="space-y-2">
          {recurring.slice(0, 12).map(r => (
            <div key={r.key} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-foreground truncate capitalize">{r.label.toLowerCase()}</div>
                <div className="text-[10px] text-muted-foreground">
                  {r.type === 'fixo' ? 'Gasto fixo' : 'Compras frequentes'} · {r.months} meses · {r.count}x
                  {r.categoryName ? ` · ${r.categoryName}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-semibold text-foreground">{formatBRL(r.perMonth)}<span className="text-[9.5px] text-muted-foreground">/mês</span></div>
                <div className="text-[10px] text-muted-foreground">{formatBRL(r.perYear)}/ano</div>
              </div>
            </div>
          ))}
          {recurring.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Ainda não há repetições suficientes para detectar.</p>
          )}
        </div>
      </Card>

      {/* Parcelas */}
      <Card>
        <SectionTitle
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          right={<span className="text-[10px] font-mono text-muted-foreground">{formatBRL(outlook.totalRemaining)} a pagar</span>}
        >
          Parcelas nos próximos 6 meses
        </SectionTitle>
        <div className="flex items-end gap-1.5 h-24">
          {outlook.perMonth.map(m => (
            <div key={m.monthISO} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-muted-foreground">
                {m.total > 0 ? Math.round(m.total / 100) / 10 + 'k' : '—'}
              </span>
              <div
                className="w-full rounded-t bg-primary/70"
                style={{ height: `${(m.total / maxOutlook) * 100}%`, minHeight: m.total > 0 ? 3 : 0 }}
              />
              <span className="text-[9px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
        {outlook.endingSoon.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-emerald-500 font-semibold">
              Acabando — libera folga por mês
            </div>
            {outlook.endingSoon.slice(0, 8).map(e => (
              <div key={e.purchaseGroupId} className="flex justify-between text-[11px]">
                <span className="text-foreground truncate">
                  {e.description} <span className="text-muted-foreground">· {e.cardName}</span>
                </span>
                <span className="shrink-0 ml-2 text-right">
                  <span className="font-mono text-emerald-500">+{formatBRL(e.installmentAmount)}</span>
                  <span className="text-[9.5px] text-muted-foreground ml-1">
                    {e.remaining === 1 ? 'última' : `${e.remaining} restantes`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Meta de economia */}
      <Card>
        <SectionTitle icon={<Scissors className="h-3.5 w-3.5" />}>Meta de economia</SectionTitle>
        <div className="flex items-center gap-1.5 mb-2">
          {[10, 20, 30].map(p => (
            <button
              key={p}
              onClick={() => setCut(p)}
              className={`h-8 px-3 rounded-xl border text-[11px] font-semibold ${
                cut === p ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border'
              }`}
            >
              cortar {p}%
            </button>
          ))}
        </div>
        <div className="text-lg font-bold text-emerald-500">
          {formatBRL(cutSaving)}<span className="text-[11px] text-muted-foreground font-normal">/mês</span>
        </div>
        <div className="text-[11px] text-muted-foreground mb-2">
          {formatBRL(cutSaving * 12)} por ano cortando {cut}% nas categorias abaixo
        </div>
        <div className="space-y-1">
          {cutCandidates.map(r => (
            <div key={r.categoryId || 'none'} className="flex justify-between text-[11px]">
              <span className="text-foreground truncate flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                {r.name}
              </span>
              <span className="shrink-0 ml-2 font-mono text-muted-foreground">
                {formatBRL(r.avgMonth)} → <span className="text-emerald-500">{formatBRL(r.avgMonth * (1 - cut / 100))}</span>
              </span>
            </div>
          ))}
          {cutCandidates.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Sem categorias discricionárias relevantes no período.</p>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pb-2">
        <ChevronDown className="h-3 w-3" /> valores consideram apenas despesas
      </div>
    </div>
  );
}
