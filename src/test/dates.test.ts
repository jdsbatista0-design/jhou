import { expect, it } from 'vitest';
import { localTodayISO } from '@/lib/dates';

it('uses the local calendar day at 23:40 instead of deriving it from UTC', () => {
  expect(localTodayISO(new Date(2026, 10, 14, 23, 40))).toBe('2026-11-14');
});