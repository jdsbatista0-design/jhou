import { expect, it } from 'vitest';
import { importedStatementMonth, statementClosingDate, statementTotal } from '@/lib/importedStatement';

it('links the imported amount to the statement paid on its due date', () => {
  expect(importedStatementMonth('2026-08-10')).toBe('2026-07');
  expect(importedStatementMonth('2026-01-09')).toBe('2025-12');
  expect(importedStatementMonth('2026-02-31')).toBeNull();
});

it('keeps due in the closing month when due day is after closing day', () => {
  expect(importedStatementMonth('2026-11-10', 4)).toBe('2026-11'); // C6
  expect(importedStatementMonth('2026-11-09', 1)).toBe('2026-11'); // Nubank
  expect(importedStatementMonth('2026-11-01', 25)).toBe('2026-10'); // Itaú
});

it('dates the statement at its closing day', () => {
  expect(statementClosingDate('2026-11', 4)).toBe('2026-11-04');
  expect(statementClosingDate('2026-02', 31)).toBe('2026-02-28');
});

it('uses the official imported total instead of a partial purchase sum', () => {
  expect(statementTotal(100, 13278.41)).toBe(13278.41);
  expect(statementTotal(100, undefined)).toBe(100);
  expect(statementTotal(100, 0)).toBe(0);
});
