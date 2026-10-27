-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.plan_tier AS ENUM ('regular', 'vip1', 'vip2', 'vip3');
CREATE TYPE public.survey_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE public.question_type AS ENUM ('single_choice', 'multi_choice', 'scale', 'text', 'number');
CREATE TYPE public.response_status AS ENUM ('in_progress', 'completed');
CREATE TYPE public.earning_type AS ENUM ('survey', 'welcome_bonus', 'streak_bonus', 'referral', 'mission', 'admin_adjustment');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE public.charge_purpose AS ENUM ('withdrawal_verification', 'plan_upgrade', 'kyc_verification');
CREATE TYPE public.charge_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'expired');
CREATE TYPE public.kyc_kind AS ENUM ('documents', 'mpesa', 'both');
CREATE TYPE public.kyc_status AS ENUM ('requested', 'submitted', 'approved', 'rejected');

-- PLANS
CREATE TABLE public.plans (
  tier public.plan_tier PRIMARY KEY,
  name TEXT NOT NULL,
  price_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  reward_per_survey NUMERIC(12,2) NOT NULL DEFAULT 0,
  withdrawal_days INTEGER NOT NULL DEFAULT 7,
  perks TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- APP SETTINGS
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT,
  tier public.plan_tier NOT NULL DEFAULT 'regular',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_day DATE,
  mpesa_verified BOOLEAN NOT NULL DEFAULT false,
  mpesa_phone TEXT,
  last_withdrawal_at TIMESTAMPTZ,
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ROLE CHECK
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POLICIES: plans + settings are public read, admin write
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_public_read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLICIES: profiles
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own_name" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLICIES: user_roles (read own, admins read all; writes only via service role)
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- SEED PLANS
INSERT INTO public.plans (tier, name, price_kes, reward_per_survey, withdrawal_days, perks, sort_order) VALUES
  ('regular', 'Regular', 0,    30,  7, ARRAY['5 surveys every day','KSh 30 per survey','Withdraw every 7 days'], 0),
  ('vip1',    'VIP 1',   1500, 80,  5, ARRAY['5 surveys every day','KSh 80 per survey','Withdraw every 5 days','Priority support'], 1),
  ('vip2',    'VIP 2',   4000, 180, 3, ARRAY['5 surveys every day','KSh 180 per survey','Withdraw every 3 days','Priority support','Bonus missions'], 2),
  ('vip3',    'VIP 3',   9000, 400, 1, ARRAY['5 surveys every day','KSh 400 per survey','Withdraw every day','VIP support','Bonus missions','Top leaderboard rewards'], 3);

-- SEED SETTINGS
INSERT INTO public.app_settings (key, value) VALUES
  ('welcome_bonus_kes', '150'),
  ('surveys_per_day', '5'),
  ('min_withdrawal_kes', '500'),
  ('hold_amount_kes', '100'),
  ('referral_target', '5'),
  ('referral_reward_tier', '"vip1"'),
  ('referral_commission_kes', '0'),
  ('streak_bonus_kes', '20'),
  ('require_kyc_for_withdrawal', 'true'),
  ('whatsapp_group_url', '""'),
  ('platform_name', '"SurveyPesa"');