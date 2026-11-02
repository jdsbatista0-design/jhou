import { describe, expect, it } from 'vitest';
import { isGeneralBillTransaction, isGeneralRecurringTransaction } from '@/lib/financeVisibility';

describe('general finance menu', () => {
  it('shows only recurring non-card entries', () => {
    expect(isGeneralRecurringTransaction({ kind: 'expense', recurrenceId: 'rent', cardId: undefined })).toBe(true);
    expect(isGeneralRecurringTransaction({ kind: 'expense', recurrenceId: undefined, cardId: undefined })).toBe(false);
  });

  it('keeps card purchases and installments out even when recurring', () => {
    expect(isGeneralRecurringTransaction({ kind: 'expense', recurrenceId: 'insurance', cardId: 'c6' })).toBe(false);
    expect(isGeneralBillTransaction({ kind: 'expense', recurrenceId: undefined, cardId: 'c6' })).toBe(false);
    expect(isGeneralBillTransaction({ kind: 'expense', recurrenceId: 'insurance', cardId: 'c6' })).toBe(false);
  });

  it('preserves consolidated card payments in bills but not general recurring entries', () => {
    for (const kind of ['card_payment', 'invoice_payment'] as const) {
      const payment = { kind, cardId: 'c6', recurrenceId: undefined };
      expect(isGeneralBillTransaction(payment)).toBe(true);
      expect(isGeneralRecurringTransaction(payment)).toBe(false);
    }
  });
});