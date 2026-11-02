# Architecture rules

- Use `src/lib/financeVisibility.ts` for general finance list and bill visibility so card purchases cannot leak into individual payment actions or totals; card statements keep their full transaction data.
- PDF imports persist the official total in the card's existing statement totals by closing-month competence, derived from the due date, so bills and payment forms share the imported value without adding an expense.