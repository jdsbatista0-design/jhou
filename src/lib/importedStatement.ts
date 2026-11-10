/**
 * Statements use closing-month competence. The bill is due in the same month
 * when the due day comes after the closing day (e.g. closes 4, due 10);
 * otherwise it is due the following month (e.g. closes 25, due 1).
 */
export function dueMonthOffset(closingDay?: number | null, dueDay?: number | null): number {
  if (closingDay && dueDay && dueDay > closingDay) return 0;
  return 1;
}

export function importedStatementMonth(dueDate: string, closingDay?: number | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  if (due.getFullYear() !== year || due.getMonth() !== month - 1 || due.getDate() !== day) return null;
  const closing = new Date(year, month - 1 - dueMonthOffset(closingDay, day), 1);
  return `${closing.getFullYear()}-${String(closing.getMonth() + 1).padStart(2, '0')}`;
}

/** Last day of the statement (its closing date) for a competence month. */
export function statementClosingDate(competence: string, closingDay?: number | null): string {
  const [y, m] = competence.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(closingDay || last, last);
  return `${competence}-${String(d).padStart(2, '0')}`;
}

export function statementTotal(computed: number, imported: number | undefined): number {
  return typeof imported === 'number' && Number.isFinite(imported) ? imported : computed;
}
