ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS meeting_date date,
  ADD COLUMN IF NOT EXISTS participants text,
  ADD COLUMN IF NOT EXISTS decisions text,
  ADD COLUMN IF NOT EXISTS next_steps text,
  ADD COLUMN IF NOT EXISTS linked_item_id uuid;