-- ============================================================
-- GiftIt Database Schema
-- Run this in Supabase > SQL Editor
-- ============================================================

-- USERS (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  gift_handle TEXT UNIQUE NOT NULL,       -- @handle (e.g. priya.kapoor)
  gift_numeric_id TEXT UNIQUE NOT NULL,   -- GIFT-XXXX-XXXX
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  recipient_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',    -- birthday, baby_shower, wedding, etc.
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(12,2),            -- optional goal
  is_surprise BOOLEAN DEFAULT FALSE,      -- hidden from recipient
  is_active BOOLEAN DEFAULT TRUE,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTRIBUTIONS (each gift payment)
CREATE TABLE public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) NOT NULL,
  gifter_user_id UUID REFERENCES public.users(id),  -- null if anonymous/no account
  gifter_name TEXT NOT NULL,
  gifter_email TEXT,
  amount NUMERIC(12,2) NOT NULL,
  message TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',          -- pending | captured | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WALLET TRANSACTIONS (ledger — never store balance directly)
CREATE TABLE public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL,                     -- credit_event | credit_p2p | debit_voucher | debit_p2p
  amount NUMERIC(12,2) NOT NULL,          -- always positive; sign implied by type
  reference_id UUID,                      -- contribution_id or voucher_id
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOUCHERS
CREATE TABLE public.vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  brand_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  voucher_code TEXT NOT NULL,
  status TEXT DEFAULT 'active',           -- active | used | cancelled
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- P2P TRANSFERS
CREATE TABLE public.p2p_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  recipient_id UUID REFERENCES public.users(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  message TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Wallet balance per user (computed from ledger)
CREATE VIEW public.wallet_balances AS
SELECT
  user_id,
  SUM(CASE WHEN type LIKE 'credit_%' THEN amount ELSE -amount END) AS balance
FROM public.wallet_transactions
GROUP BY user_id;

-- Event totals
CREATE VIEW public.event_totals AS
SELECT
  event_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS contributor_count
FROM public.contributions
WHERE status = 'captured'
GROUP BY event_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read (for GiftID search), only you can update yourself
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_self_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_self_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Events: public can read active events, creators/recipients can manage
CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (is_active = true AND is_surprise = false);
CREATE POLICY "events_recipient_read" ON public.events FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "events_creator_all" ON public.events FOR ALL USING (auth.uid() = creator_id);

-- Contributions: event participants can see, anyone can insert (to gift)
CREATE POLICY "contributions_read" ON public.contributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.creator_id = auth.uid() OR e.recipient_id = auth.uid())));
CREATE POLICY "contributions_insert" ON public.contributions FOR INSERT WITH CHECK (true);

-- Wallet: only you can see your transactions
CREATE POLICY "wallet_self_only" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Vouchers: only you can see yours
CREATE POLICY "vouchers_self_only" ON public.vouchers FOR ALL USING (auth.uid() = user_id);

-- P2P: only sender/recipient can see
CREATE POLICY "p2p_self_only" ON public.p2p_transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "p2p_insert" ON public.p2p_transfers FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- FUNCTION: generate unique gift numeric ID
-- ============================================================
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

-- ============================================================
-- TRIGGER: auto-create user profile after auth signup
-- ============================================================
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
