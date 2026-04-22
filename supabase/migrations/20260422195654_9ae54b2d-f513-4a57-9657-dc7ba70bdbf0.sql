CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App can read shared settings" ON public.app_settings;
CREATE POLICY "App can read shared settings"
ON public.app_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "App can create shared settings" ON public.app_settings;
CREATE POLICY "App can create shared settings"
ON public.app_settings
FOR INSERT
WITH CHECK (key = 'central_settings');

DROP POLICY IF EXISTS "App can update shared settings" ON public.app_settings;
CREATE POLICY "App can update shared settings"
ON public.app_settings
FOR UPDATE
USING (key = 'central_settings')
WITH CHECK (key = 'central_settings');

INSERT INTO public.app_settings (key, value)
VALUES (
  'central_settings',
  '{
    "tipos": ["Inbox", "Ação", "Nota"],
    "fases": ["Inbox", "Em andamento", "Aguardando", "Travado", "Concluído"],
    "areas": ["Izi", "Mídia", "Incorporação", "Stone", "Pessoal", "BJ7Mídia", "Casa", "Filhas"],
    "tagGroups": [
      { "name": "Contexto", "tags": ["estratégico", "operacional", "pessoal", "delegado"] },
      { "name": "Status", "tags": ["urgente", "importante", "aguardando retorno"] }
    ],
    "agendaTypes": ["Reunião", "Visita", "Compromisso", "Prazo"]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_app_settings_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;