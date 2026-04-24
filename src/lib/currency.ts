// Helpers to format currency input as the user types (pt-BR / BRL).

/**
 * Convert a raw input string (typed by the user) into a masked BRL string.
 * Always treats the rightmost 2 digits as cents.
 *  ""        -> ""
 *  "1"       -> "0,01"
 *  "12"      -> "0,12"
 *  "123"     -> "1,23"
 *  "123456"  -> "1.234,56"
 */
export function maskBRLInput(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decPart = padded.slice(-2);
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intFmt},${decPart}`;
}

/** Convert a masked BRL string back to a number (in reais). */
export function parseBRLInput(masked: string): number {
  if (!masked) return 0;
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/** Convert a number (reais) to the masked input format used in inputs. */
export function numberToBRLInput(value: number): string {
  if (!value && value !== 0) return '';
  const cents = Math.round(value * 100);
  return maskBRLInput(String(cents));
}
