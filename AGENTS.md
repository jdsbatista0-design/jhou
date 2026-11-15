# Architecture rules

- Keep Minha semana isolated in its own route, hook, tables and edge function; share pure planning rules from `_shared/weekPlan.ts` to keep Google previews and exported events consistent without changing existing agenda logic.
- Weekly Google exports only delete IDs owned by that week's sync record and persist progress after each operation; existing recurring workouts are read-only references and never copied into weekly training data.

- Use `src/lib/financeVisibility.ts` for general finance list and bill visibility so card purchases cannot leak into individual payment actions or totals; card statements keep their full transaction data.
- PDF imports persist the official total in the card's existing statement totals by closing-month competence, derived from the due date, so bills and payment forms share the imported value without adding an expense.
- Derive daily and monthly bills through `billsForDueMonth` in `src/lib/billsByDue.ts`, and forecasts through its competence helper, so invoice payments never become duplicate bills and all views use the same due month.
- Keep finance routes under one persistent layout provider so moving between Hoje and Dinheiro reuses loaded data and the subscription.
- Use `localTodayISO` for local calendar dates and `CaptureAction` for page capture buttons so time zones and safe-area positioning are consistent.
