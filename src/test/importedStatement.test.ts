import { expect, it } from 'vitest';
import { importedStatementMonth, statementTotal } from '@/lib/importedStatement';

it('links the imported amount to the statement paid on its due date', () => {
  expect(importedStatementMonth('2026-08-10')).toBe('2026-07');
  expect(importedStatementMonth('2026-01-09')).toBe('2025-12');
  expect(importedStatementMonth('2026-02-31')).toBeNull();
});

it('uses the official imported total instead of a partial purchase sum', () => {
  expect(statementTotal(100, 13278.41)).toBe(13278.41);
  expect(statementTotal(100, 285.82)).toBe(285.82);
  expect(statementTotal(100, undefined)).toBe(100);
  expect(statementTotal(100, 0)).toBe(0);
});