import { dueMonthOffset } from '@/lib/importedStatement';
import { isGeneralRecurringTransaction } from '@/lib/financeVisibility';
import type { FinCard, FinTransaction } from '@/types/finance';

export const shiftMonthISO = (iso: string, delta: number) => {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Competência (mês de fechamento) da fatura de um cartão que vence no mês `dueMonthISO`. */
export function competenceForDueMonth(dueMonthISO: string, closingDay?: number | null, dueDay?: number | null) {
  return shiftMonthISO(dueMonthISO, -dueMonthOffset(closingDay, dueDay));
}

export interface Bill {
  key: string;
  kind: 'card' | 'fixed';
  title: string;
  dueOn: string;
  amount: number;
  paid: boolean;
  cardId?: string;
  competence?: string;
  tx?: FinTransaction;
}

type StatementReader = (cardId: string, competence: string) => {
  due: string | null; total: number; remaining: number;
};

/** One source for both the daily agenda and monthly bills. Payments are never new bills. */
export function billsForDueMonth(cards: FinCard[], transactions: FinTransaction[], read: StatementReader,
  month: string, includeOverdue = false): Bill[] {
  const bills: Bill[] = [];
  for (const card of cards.filter(c => !c.archived && c.scope === 'pf')) {
    for (const delta of includeOverdue ? [-3, -2, -1, 0] : [0]) {
      const competence = competenceForDueMonth(shiftMonthISO(month, delta), card.closingDay, card.dueDay);
      const statement = read(card.id, competence);
      if (!statement.due || statement.total <= 0.009) continue;
      const paid = statement.remaining <= 0.009;
      if (delta < 0 && paid) continue;
      bills.push({ key: `card-${card.id}-${competence}`, kind: 'card', title: `Fatura ${card.name}`,
        dueOn: statement.due, amount: paid ? statement.total : statement.remaining, paid, cardId: card.id, competence });
    }
  }
  for (const tx of transactions) {
    if (tx.scope !== 'pf' || !isGeneralRecurringTransaction(tx)
      || tx.kind !== 'expense' || tx.status === 'cancelled') continue;
    if (!tx.occurredOn.startsWith(month) && !(includeOverdue && tx.status === 'pending' && tx.occurredOn < `${month}-01`)) continue;
    bills.push({ key: `tx-${tx.id}`, kind: 'fixed', title: tx.description, dueOn: tx.occurredOn,
      amount: tx.amount, paid: tx.status === 'confirmed', tx });
  }
  return bills.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
