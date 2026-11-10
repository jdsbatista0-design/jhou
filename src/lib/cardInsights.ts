import type { FinTransaction } from '@/types/finance';

type Tx = Pick<FinTransaction, 'amount' | 'description' | 'installmentNo' | 'installmentTotal' | 'categoryId' | 'purchaseGroupId'>;

export const isInstallment = (t: Tx) => (t.installmentTotal ?? 0) > 1;

/** Split a statement into committed installments and new (one-off) purchases. */
export function splitStatement(txs: Tx[]) {
  let installments = 0, purchases = 0;
  for (const t of txs) (isInstallment(t) ? (installments += t.amount) : (purchases += t.amount));
  return { installments, purchases };
}

/** Installments paying their last part in this statement: amount freed from the next one. */
export function endingInstallments<T extends Tx>(txs: T[]): T[] {
  return txs.filter(t => isInstallment(t) && t.installmentNo === t.installmentTotal);
}

export function normalizeMerchant(description: string): string {
  return description
    .replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g, '')
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, '')
    .replace(/[*\-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export interface Ranked { key: string; total: number; avg: number; prevTotal: number; deltaPct: number | null }

/** Rank groups over the current window vs. the previous window of the same length. */
export function rankBy<T>(current: T[], previous: T[], key: (t: T) => string, amount: (t: T) => number, months: number, limit = 5): Ranked[] {
  const sum = (list: T[]) => {
    const m = new Map<string, number>();
    for (const t of list) m.set(key(t), (m.get(key(t)) ?? 0) + amount(t));
    return m;
  };
  const cur = sum(current), prev = sum(previous);
  return [...cur.entries()]
    .map(([k, total]) => {
      const p = prev.get(k) ?? 0;
      return { key: k, total, avg: total / Math.max(1, months), prevTotal: p, deltaPct: p > 0 ? ((total - p) / p) * 100 : null };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Same merchant in at least `minMonths` distinct statements = recurring charge. */
export function recurringMerchants(byMonth: { monthISO: string; txs: Tx[] }[], minMonths = 3) {
  const map = new Map<string, { months: Set<string>; total: number }>();
  for (const { monthISO, txs } of byMonth) for (const t of txs) {
    if (isInstallment(t)) continue;
    const k = normalizeMerchant(t.description);
    if (!k) continue;
    const e = map.get(k) ?? { months: new Set<string>(), total: 0 };
    e.months.add(monthISO); e.total += t.amount; map.set(k, e);
  }
  return [...map.entries()]
    .filter(([, e]) => e.months.size >= minMonths)
    .map(([name, e]) => ({ name, months: e.months.size, monthly: e.total / e.months.size, yearly: (e.total / e.months.size) * 12 }))
    .sort((a, b) => b.yearly - a.yearly);
}

export const shiftMonth = (monthISO: string, delta: number) => {
  const [y, m] = monthISO.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (monthISO: string) =>
  new Date(monthISO + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
