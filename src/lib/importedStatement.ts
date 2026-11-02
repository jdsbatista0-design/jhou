/** Statements use closing-month competence; payment is due the following month. */
export function importedStatementMonth(dueDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  if (due.getFullYear() !== year || due.getMonth() !== month - 1 || due.getDate() !== day) return null;
  const closing = new Date(year, month - 2, 1);
  return `${closing.getFullYear()}-${String(closing.getMonth() + 1).padStart(2, '0')}`;
}

export function statementTotal(computed: number, imported: number | undefined): number {
  return typeof imported === 'number' && Number.isFinite(imported) ? imported : computed;
}