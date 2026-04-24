
-- 1. Remover tabelas sensíveis da publicação Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE 
  public.memories, 
  public.items, 
  public.inbox_entries, 
  public.events, 
  public.app_settings;

-- 2. user_id NOT NULL + DEFAULT auth.uid() em todas as tabelas privadas
ALTER TABLE public.app_settings  ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.events        ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.inbox_entries ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.item_comments ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.items         ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.memories      ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
