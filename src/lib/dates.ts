export function getDatePart(value?: string): string {
  return value ? value.split('T')[0] : '';
}

export function parseLocalDateTime(value?: string): Date | null {
  if (!value) return null;
  const [datePart, timePart = '12:00'] = value.split('T');
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const [hours = '12', minutes = '00'] = timePart.replace(/Z$/, '').split(':');
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));

  if (parsed.getFullYear() !== Number(year) || parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(day)) {
    return null;
  }

  return parsed;
}