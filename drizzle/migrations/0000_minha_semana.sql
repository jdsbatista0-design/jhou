CREATE TABLE public.semanas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 semana_inicio date NOT NULL CHECK (extract(isodow from semana_inicio) = 1),
 slots jsonb NOT NULL DEFAULT '{}'::jsonb, treinos jsonb NOT NULL DEFAULT '{}'::jsonb,
 leitura jsonb NOT NULL DEFAULT '{"on":false,"hora":"21:30"}'::jsonb,
 sync jsonb NOT NULL DEFAULT '{}'::jsonb,
 editado_em timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, semana_inicio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semanas TO authenticated;
GRANT ALL ON public.semanas TO service_role;
ALTER TABLE public.semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY semanas_proprias ON public.semanas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.dias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, data date NOT NULL,
 treino boolean NOT NULL DEFAULT false, leitura boolean NOT NULL DEFAULT false,
 jantar boolean NOT NULL DEFAULT false, programa boolean NOT NULL DEFAULT false, fe boolean NOT NULL DEFAULT false,
 UNIQUE(user_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dias TO authenticated;
GRANT ALL ON public.dias TO service_role;
ALTER TABLE public.dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY dias_proprios ON public.dias FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.validar_dia_semana() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.data > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
 RAISE EXCEPTION 'Não é permitido registrar dias futuros';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validar_dia_semana BEFORE INSERT OR UPDATE ON public.dias FOR EACH ROW EXECUTE FUNCTION public.validar_dia_semana();