-- ============================================================
-- GiftIt Database Schema (SAFE VERSION — skips existing tables)
-- Run this in Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  gift_handle TEXT UNIQUE NOT NULL DEFAULT '',
  gift_numeric_id TEXT UNIQUE NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  recipient_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(12,2),
  is_surprise BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) NOT NULL,
  gifter_user_id UUID REFERENCES public.users(id),
  gifter_name TEXT NOT NULL,
  gifter_email TEXT,
  amount NUMERIC(12,2) NOT NULL,
  message TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  brand_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  voucher_code TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.p2p_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  recipient_id UUID REFERENCES public.users(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  message TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Views (drop and recreate safely)
DROP VIEW IF EXISTS public.wallet_balances;
CREATE VIEW public.wallet_balances AS
SELECT
  user_id,
  SUM(CASE WHEN type LIKE 'credit_%' THEN amount ELSE -amount END) AS balance
FROM public.wallet_transactions
GROUP BY user_id;

DROP VIEW IF EXISTS public.event_totals;
CREATE VIEW public.event_totals AS
SELECT
  event_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS contributor_count
FROM public.contributions
WHERE status = 'captured'
GROUP BY event_id;

-- RLS (safe to run again)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;

-- Policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_recipient_read" ON public.events;
DROP POLICY IF EXISTS "events_creator_all" ON public.events;
DROP POLICY IF EXISTS "contributions_read" ON public.contributions;
DROP POLICY IF EXISTS "contributions_insert" ON public.contributions;
DROP POLICY IF EXISTS "wallet_self_only" ON public.wallet_transactions;
DROP POLICY IF EXISTS "vouchers_self_only" ON public.vouchers;
DROP POLICY IF EXISTS "p2p_self_only" ON public.p2p_transfers;
DROP POLICY IF EXISTS "p2p_insert" ON public.p2p_transfers;

CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_self_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_self_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (is_active = true AND is_surprise = false);
CREATE POLICY "events_recipient_read" ON public.events FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "events_creator_all" ON public.events FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "contributions_read" ON public.contributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.creator_id = auth.uid() OR e.recipient_id = auth.uid())));
CREATE POLICY "contributions_insert" ON public.contributions FOR INSERT WITH CHECK (true);

CREATE POLICY "wallet_self_only" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vouchers_self_only" ON public.vouchers FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "p2p_self_only" ON public.p2p_transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "p2p_insert" ON public.p2p_transfers FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Functions and trigger
CREATE OR REPLACE FUNCTION generate_gift_numeric_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
BEGIN
  LOOP
    new_id := 'GIFT-' ||
      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') || '-' ||
      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE gift_numeric_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, email, full_name, gift_handle, gift_numeric_id)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'gift_handle', 'user_' || SUBSTR(NEW.id::TEXT, 1, 8)),
    generate_gift_numeric_id()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
