
-- Estado de sync por usuário
CREATE TABLE public.gcal_state (
  user_id uuid PRIMARY KEY,
  calendar_id text,
  sync_token text,
  last_pull_at timestamptz,
  last_push_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gcal_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own gcal_state"
  ON public.gcal_state FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_gcal_state_updated
  BEFORE UPDATE ON public.gcal_state
  FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

-- Mapping item <-> google event
CREATE TABLE public.gcal_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid,                    -- nullable: pode ser evento criado direto no Google sem item
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL,
  last_local_updated_at timestamptz,
  last_remote_updated_at timestamptz,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_event_id)
);
CREATE INDEX idx_gcal_sync_item ON public.gcal_sync (user_id, item_id);

ALTER TABLE public.gcal_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own gcal_sync"
  ON public.gcal_sync FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_gcal_sync_updated
  BEFORE UPDATE ON public.gcal_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();
