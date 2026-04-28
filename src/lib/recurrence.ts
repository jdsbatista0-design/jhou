import { Recurrence, Weekday } from '@/types/central';

export const MATERIALIZE_DAYS_AHEAD = 60;

function isoWeekday(date: Date): Weekday {
  // JS getDay: 0=Sun..6=Sat. ISO: 1=Mon..7=Sun
  const js = date.getDay();
  return (js === 0 ? 7 : js) as Weekday;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns dates (YYYY-MM-DD) where this recurrence should generate occurrences,
 * starting from `from` (inclusive) until `to` (inclusive).
 */
export function expandRecurrence(rec: Recurrence, from: Date, to: Date): string[] {
  if (!rec.active || rec.weekdays.length === 0) return [];
  const start = new Date(rec.startDate + 'T00:00:00');
  const end = rec.endDate ? new Date(rec.endDate + 'T00:00:00') : null;

  const cursor = new Date(Math.max(start.getTime(), from.getTime()));
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(Math.min(to.getTime(), end ? end.getTime() : to.getTime()));
  last.setHours(0, 0, 0, 0);

  const out: string[] = [];
  while (cursor <= last) {
    if (rec.weekdays.includes(isoWeekday(cursor))) {
      out.push(ymd(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function nextHorizonDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + MATERIALIZE_DAYS_AHEAD);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayYMD(): string {
  return ymd(new Date());
}

export function weekdaysSummary(days: Weekday[]): string {
  if (days.length === 0) return '—';
  const labels = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  return [...days].sort((a, b) => a - b).map(d => labels[d]).join(', ');
}
