-- Add card_payment kind + installment fields + paid_card_month
-- Drop existing kind CHECK constraint if any, then add updated one
DO $$
DECLARE con text;
BEGIN
  SELECT conname INTO con FROM pg_constraint
    WHERE conrelid = 'public.fin_transactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%kind%';
  IF con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.fin_transactions DROP CONSTRAINT %I', con);
  END IF;
END $$;

ALTER TABLE public.fin_transactions
  ADD COLUMN IF NOT EXISTS installment_no int,
  ADD COLUMN IF NOT EXISTS installment_total int,
  ADD COLUMN IF NOT EXISTS purchase_group_id uuid,
  ADD COLUMN IF NOT EXISTS paid_card_month date;

ALTER TABLE public.fin_transactions
  ADD CONSTRAINT fin_transactions_kind_check
  CHECK (kind IN ('expense','income','transfer','card_payment'));

CREATE INDEX IF NOT EXISTS idx_fin_tx_card_occurred ON public.fin_transactions(card_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_fin_tx_purchase_group ON public.fin_transactions(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_card_paid_month ON public.fin_transactions(card_id, paid_card_month);