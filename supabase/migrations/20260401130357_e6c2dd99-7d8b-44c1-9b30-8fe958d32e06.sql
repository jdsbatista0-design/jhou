
CREATE TABLE public.inbox_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'photo', 'audio')),
  photo_url TEXT,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'archived')),
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'whatsapp')),
  whatsapp_from TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS - this is a personal app protected by PIN lock
ALTER TABLE public.inbox_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app, no auth)
CREATE POLICY "Allow all access to inbox_entries"
  ON public.inbox_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);
