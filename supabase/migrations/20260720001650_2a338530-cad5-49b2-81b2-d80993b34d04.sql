
-- Passo 1: prepare schema for new Home (3 blocks) + Kind classification foundation

-- Add fields to items table
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'my_action',
  ADD COLUMN IF NOT EXISTS waiting_for text,
  ADD COLUMN IF NOT EXISTS impact_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_people int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_surfaced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_context jsonb;

-- Check constraint on kind values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_kind_check'
  ) THEN
    ALTER TABLE public.items
      ADD CONSTRAINT items_kind_check
      CHECK (kind IN ('my_action','waiting_someone','my_decision','appointment','info'));
  END IF;
END $$;

-- Index to speed up Home queries
CREATE INDEX IF NOT EXISTS items_user_kind_idx ON public.items(user_id, kind) WHERE fase <> 'Concluído';
CREATE INDEX IF NOT EXISTS items_user_last_surfaced_idx ON public.items(user_id, last_surfaced_at);

-- Daily priorities table (the 3 slots)
CREATE TABLE IF NOT EXISTS public.daily_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  replaced_from uuid,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_priorities TO authenticated;
GRANT ALL ON public.daily_priorities TO service_role;

ALTER TABLE public.daily_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daily_priorities" ON public.daily_priorities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_priorities_user_date_idx ON public.daily_priorities(user_id, date);

CREATE TRIGGER daily_priorities_set_updated_at
  BEFORE UPDATE ON public.daily_priorities
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();
