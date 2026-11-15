import { describe, expect, it } from 'vitest';
import { billsForDueMonth } from '@/lib/billsByDue';
import type { FinCard, FinTransaction } from '@/types/finance';

const cards: FinCard[] = [
  { id: 'c6', name: 'C6', scope: 'pf', closingDay: 4, dueDay: 10, archived: false, limitAmount: 0, color: '', createdAt: '' },
  { id: 'itau', name: 'Itaú', scope: 'pf', closingDay: 25, dueDay: 1, archived: false, limitAmount: 0, color: '', createdAt: '' },
];
const transaction = (change: Partial<FinTransaction>): FinTransaction => ({
  id: 'rent', scope: 'pf', kind: 'expense', amount: 100, description: 'Aluguel', occurredOn: '2026-12-10',
  status: 'pending', source: 'manual', createdAt: '', recurrenceId: 'rent-rule', ...change,
});

describe('shared agenda and money bills', () => {
  it('uses the official invoice total and correct due month for each card', () => {
    const bills = billsForDueMonth(cards, [], (id, month) => {
      expect(month).toBe(id === 'c6' ? '2026-12' : '2026-11');
      return { due: id === 'c6' ? '2026-12-10' : '2026-12-01', total: id === 'c6' ? 4619.75 : 2253.85,
        remaining: id === 'c6' ? 4619.75 : 2253.85 };
    }, '2026-12');
    expect(bills.map(b => b.amount)).toEqual([2253.85, 4619.75]);
    expect(bills.reduce((sum, b) => sum + b.amount, 0)).toBe(6873.60);
  });

  it('never creates individual bills from purchases or card settlements', () => {
    const bills = billsForDueMonth([], [
      transaction({ id: 'purchase', cardId: 'c6' }),
      transaction({ id: 'payment', kind: 'card_payment', cardId: 'c6' }),
      transaction({ id: 'invoice', kind: 'invoice_payment' }),
      transaction({ id: 'one-off', recurrenceId: undefined }),
      transaction({}),
    ], () => ({ due: null, total: 0, remaining: 0 }), '2026-12');
    expect(bills.map(b => b.key)).toEqual(['tx-rent']);
  });

  it('keeps paid invoices in history and does not repeat them as overdue', () => {
    const bills = billsForDueMonth(cards.slice(0, 1), [], (_, competence) => ({
      due: `${competence}-10`, total: 12195.96, remaining: 0,
    }), '2026-11', true);
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ paid: true, amount: 12195.96, dueOn: '2026-11-10' });
  });

  it('excludes cancelled recurring accounts', () => {
    expect(billsForDueMonth([], [transaction({ status: 'cancelled' })],
      () => ({ due: null, total: 0, remaining: 0 }), '2026-12')).toEqual([]);
  });
});