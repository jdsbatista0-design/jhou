# Architecture rules

- Use `src/lib/financeVisibility.ts` for general finance list and bill visibility so card purchases cannot leak into individual payment actions or totals; card statements keep their full transaction data.