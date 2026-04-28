-- Recurrences table
CREATE TABLE public.recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Pessoal',
  type TEXT NOT NULL DEFAULT 'Compromisso',
  time TEXT NOT NULL, -- HH:mm
  weekdays JSONB NOT NULL DEFAULT '[]'::jsonb, -- [1..7] ISO (1=Mon)
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reminder_minutes INTEGER NOT NULL DEFAULT 30,
  last_materialized_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own recurrences"
ON public.recurrences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER recurrences_updated_at
BEFORE UPDATE ON public.recurrences
FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own push_subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Extra columns on items for recurrence + reminders
ALTER TABLE public.items
  ADD COLUMN recurrence_id UUID,
  ADD COLUMN reminder_minutes INTEGER,
  ADD COLUMN reminder_sent_at TIMESTAMPTZ;

CREATE INDEX idx_items_reminder_pending
  ON public.items (deadline, deadline_time)
  WHERE reminder_minutes IS NOT NULL AND reminder_sent_at IS NULL;

CREATE INDEX idx_items_recurrence_id ON public.items (recurrence_id);