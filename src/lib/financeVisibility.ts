import type { FinTransaction } from '@/types/finance';

type TransactionVisibility = Pick<FinTransaction, 'cardId' | 'recurrenceId' | 'kind'>;

/** Individual general-menu entries are recurring bank transactions, never card purchases. */
export function isGeneralRecurringTransaction(transaction: TransactionVisibility): boolean {
  return Boolean(transaction.recurrenceId) && !transaction.cardId;
}

/** Card settlements remain consolidated bills, not individual purchases. */
export function isGeneralBillTransaction(transaction: TransactionVisibility): boolean {
  return isGeneralRecurringTransaction(transaction)
    || transaction.kind === 'card_payment'
    || transaction.kind === 'invoice_payment';
}