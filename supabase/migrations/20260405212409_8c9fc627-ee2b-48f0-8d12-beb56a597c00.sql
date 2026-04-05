
-- Items table
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  photo_url text,
  tipo text NOT NULL DEFAULT 'Ação',
  fase text NOT NULL DEFAULT 'Capturado',
  area text NOT NULL DEFAULT 'Pessoal',
  priority text,
  deadline text,
  deadline_time text,
  person text,
  asset text,
  value numeric,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_agenda_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Item comments table
CREATE TABLE public.item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Memories table
CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'geral',
  area text,
  login text,
  password text,
  url text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  datetime timestamptz NOT NULL,
  duration integer,
  type text NOT NULL DEFAULT 'Compromisso',
  linked_item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies (public access, no auth)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to items" ON public.items FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to item_comments" ON public.item_comments FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to memories" ON public.memories FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to events" ON public.events FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
