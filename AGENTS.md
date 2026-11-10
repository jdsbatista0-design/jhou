# Architecture rules

- Use `src/lib/financeVisibility.ts` for general finance list and bill visibility so card purchases cannot leak into individual payment actions or totals; card statements keep their full transaction data.
- PDF imports persist the official total in the card's existing statement totals by closing-month competence, derived from the due date, so bills and payment forms share the imported value without adding an expense.- Group card bills by due month via `src/lib/billsByDue.ts` (competence = due month minus offset) so Hoje, Dinheiro and forecasts always agree on which statement is due.
