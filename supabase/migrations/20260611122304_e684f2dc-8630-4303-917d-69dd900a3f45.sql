ALTER TABLE public.fin_categories ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_items_origin ON public.items(origin);