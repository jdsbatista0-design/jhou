-- Permitir 1 settings row por (user_id, key)
DROP INDEX IF EXISTS app_settings_key_unique;
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey CASCADE;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_user_key_unique UNIQUE (user_id, key);