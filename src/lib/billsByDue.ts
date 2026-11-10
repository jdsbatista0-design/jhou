import { dueMonthOffset } from '@/lib/importedStatement';

export const shiftMonthISO = (iso: string, delta: number) => {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Competência (mês de fechamento) da fatura de um cartão que vence no mês `dueMonthISO`. */
export function competenceForDueMonth(dueMonthISO: string, closingDay?: number | null, dueDay?: number | null) {
  return shiftMonthISO(dueMonthISO, -dueMonthOffset(closingDay, dueDay));
}
