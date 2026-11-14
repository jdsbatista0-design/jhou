REVOKE INSERT, UPDATE ON public.semanas FROM authenticated;
GRANT INSERT (user_id, semana_inicio, slots, treinos, leitura, editado_em) ON public.semanas TO authenticated;
GRANT UPDATE (slots, treinos, leitura, editado_em) ON public.semanas TO authenticated;