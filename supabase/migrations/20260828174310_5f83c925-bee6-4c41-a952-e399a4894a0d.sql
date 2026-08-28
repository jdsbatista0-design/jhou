ALTER TABLE public.recurrences
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'compromisso';

CREATE TABLE IF NOT EXISTS public.recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recurrence_id uuid NOT NULL REFERENCES public.recurrences(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'cancelled',
  override_time text,
  override_title text,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurrence_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrence_exceptions TO authenticated;
GRANT ALL ON public.recurrence_exceptions TO service_role;

ALTER TABLE public.recurrence_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own recurrence exceptions"
ON public.recurrence_exceptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recurrence_exceptions_user_date_idx
  ON public.recurrence_exceptions (user_id, date);

CREATE TRIGGER recurrence_exceptions_updated_at
BEFORE UPDATE ON public.recurrence_exceptions
FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();