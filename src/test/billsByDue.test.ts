import { expect, it } from 'vitest';
import { competenceForDueMonth } from '@/lib/billsByDue';

it('picks the statement that is due in the given month', () => {
  expect(competenceForDueMonth('2026-12', 4, 10)).toBe('2026-12');  // C6: fecha 4, vence 10
  expect(competenceForDueMonth('2026-12', 25, 1)).toBe('2026-11');  // Itaú: fecha 25, vence 1
  expect(competenceForDueMonth('2027-01', 25, 1)).toBe('2026-12');
});
