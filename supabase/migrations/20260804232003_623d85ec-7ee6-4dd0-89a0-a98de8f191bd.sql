CREATE TABLE public.trello_config (
  user_id uuid NOT NULL PRIMARY KEY,
  board_id text NOT NULL,
  board_url text,
  lists jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trello_config TO authenticated;
GRANT ALL ON public.trello_config TO service_role;
ALTER TABLE public.trello_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trello_config" ON public.trello_config FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_trello_config_updated BEFORE UPDATE ON public.trello_config
  FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

CREATE TABLE public.trello_sync (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  card_id text NOT NULL,
  list_id text,
  card_short_url text,
  last_local_updated_at timestamptz,
  last_remote_updated_at timestamptz,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
CREATE INDEX idx_trello_sync_item ON public.trello_sync(user_id, item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trello_sync TO authenticated;
GRANT ALL ON public.trello_sync TO service_role;
ALTER TABLE public.trello_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trello_sync" ON public.trello_sync FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_trello_sync_updated BEFORE UPDATE ON public.trello_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();