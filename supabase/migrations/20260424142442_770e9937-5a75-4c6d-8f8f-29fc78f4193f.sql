-- ============================================
-- FINANCE MODULE — Phase 1
-- ============================================

-- Reuse existing public.update_app_settings_updated_at? It's specific. Create a generic one.
CREATE OR REPLACE FUNCTION public.fin_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 1. Companies (PJ)
-- ============================================
CREATE TABLE public.fin_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  cnpj text,
  color text NOT NULL DEFAULT '#6366f1',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_companies" ON public.fin_companies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_companies_updated BEFORE UPDATE ON public.fin_companies
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();

-- ============================================
-- 2. Accounts (bank accounts) — PF or PJ
-- ============================================
CREATE TABLE public.fin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('pf','pj')),
  company_id uuid REFERENCES public.fin_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  bank text,
  type text NOT NULL DEFAULT 'corrente' CHECK (type IN ('corrente','poupanca','investimento','dinheiro','outro')),
  initial_balance numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#0ea5e9',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_accounts_scope_company CHECK (
    (scope = 'pf' AND company_id IS NULL) OR
    (scope = 'pj' AND company_id IS NOT NULL)
  )
);
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_accounts" ON public.fin_accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_accounts_updated BEFORE UPDATE ON public.fin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();
CREATE INDEX fin_accounts_user_scope_idx ON public.fin_accounts(user_id, scope);

-- ============================================
-- 3. Cards (credit cards)
-- ============================================
CREATE TABLE public.fin_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('pf','pj')),
  company_id uuid REFERENCES public.fin_companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text,
  limit_amount numeric NOT NULL DEFAULT 0,
  closing_day integer CHECK (closing_day BETWEEN 1 AND 31),
  due_day integer CHECK (due_day BETWEEN 1 AND 31),
  color text NOT NULL DEFAULT '#a855f7',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_cards_scope_company CHECK (
    (scope = 'pf' AND company_id IS NULL) OR
    (scope = 'pj' AND company_id IS NOT NULL)
  )
);
ALTER TABLE public.fin_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_cards" ON public.fin_cards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_cards_updated BEFORE UPDATE ON public.fin_cards
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();
CREATE INDEX fin_cards_user_scope_idx ON public.fin_cards(user_id, scope);

-- ============================================
-- 4. Categories
-- ============================================
CREATE TABLE public.fin_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('pf','pj')),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'expense' CHECK (kind IN ('income','expense','transfer')),
  color text NOT NULL DEFAULT '#64748b',
  icon text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_categories" ON public.fin_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX fin_categories_user_scope_idx ON public.fin_categories(user_id, scope);

-- ============================================
-- 5. People (employees / suppliers — PJ context)
-- ============================================
CREATE TABLE public.fin_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid REFERENCES public.fin_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'other' CHECK (role IN ('employee','supplier','client','other')),
  document text,
  note text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_people" ON public.fin_people
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX fin_people_user_company_idx ON public.fin_people(user_id, company_id);

-- ============================================
-- 6. Recurrences (templates that generate transactions)
-- ============================================
CREATE TABLE public.fin_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('pf','pj')),
  company_id uuid REFERENCES public.fin_companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.fin_cards(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','yearly')),
  day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31),
  start_on date NOT NULL,
  end_on date,
  active boolean NOT NULL DEFAULT true,
  last_generated_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_recurrences" ON public.fin_recurrences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_recurrences_updated BEFORE UPDATE ON public.fin_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();

-- ============================================
-- 7. Transactions (the core ledger)
-- ============================================
CREATE TABLE public.fin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('pf','pj')),
  company_id uuid REFERENCES public.fin_companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.fin_cards(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.fin_people(id) ON DELETE SET NULL,
  recurrence_id uuid REFERENCES public.fin_recurrences(id) ON DELETE SET NULL,
  -- transfer_id groups two rows that form a transfer (between accounts or between companies)
  transfer_id uuid,
  kind text NOT NULL CHECK (kind IN (
    'income','expense','transfer','card_payment','invoice_payment',
    'employee_payment','supplier_payment','employee_loan','bank_loan','tax','receivable','inter_company'
  )),
  amount numeric NOT NULL,
  description text NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  attachment_url text,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','recurrence','sheet','bank')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fin_transactions" ON public.fin_transactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_transactions_updated BEFORE UPDATE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fin_set_updated_at();
CREATE INDEX fin_transactions_user_occurred_idx ON public.fin_transactions(user_id, occurred_on DESC);
CREATE INDEX fin_transactions_user_scope_idx ON public.fin_transactions(user_id, scope);
CREATE INDEX fin_transactions_account_idx ON public.fin_transactions(account_id);
CREATE INDEX fin_transactions_card_idx ON public.fin_transactions(card_id);
CREATE INDEX fin_transactions_company_idx ON public.fin_transactions(company_id);
CREATE INDEX fin_transactions_transfer_idx ON public.fin_transactions(transfer_id) WHERE transfer_id IS NOT NULL;

-- ============================================
-- Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_recurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_transactions;