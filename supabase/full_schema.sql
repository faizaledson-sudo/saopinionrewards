-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('regular', 'vip1', 'vip2', 'vip3');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.survey_status AS ENUM ('draft', 'active', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM ('single_choice', 'multi_choice', 'scale', 'text', 'number');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.response_status AS ENUM ('in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.earning_type AS ENUM ('survey', 'welcome_bonus', 'streak_bonus', 'referral', 'mission', 'admin_adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.charge_purpose AS ENUM ('withdrawal_verification', 'plan_upgrade', 'kyc_verification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.charge_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.kyc_kind AS ENUM ('documents', 'mpesa', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('requested', 'submitted', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PLANS
CREATE TABLE IF NOT EXISTS public.plans (
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
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.user_roles (
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

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POLICIES: plans + settings are public read, admin write
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "plans_admin_write" ON public.plans;
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_public_read" ON public.app_settings;
CREATE POLICY "settings_public_read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_write" ON public.app_settings;
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLICIES: profiles
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own_name" ON public.profiles;
CREATE POLICY "profiles_update_own_name" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLICIES: user_roles (read own, admins read all; writes only via service role)
DROP POLICY IF EXISTS "roles_read_own" ON public.user_roles;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- SEED PLANS
INSERT INTO public.plans (tier, name, price_kes, reward_per_survey, withdrawal_days, perks, sort_order) VALUES
  ('regular', 'Regular', 0,   4,  7, ARRAY['5 surveys every day','R 4 per survey','Withdraw every 7 days'], 0),
  ('vip1',    'VIP 1',   150, 10, 5, ARRAY['5 surveys every day','R 10 per survey','Withdraw every 5 days','Priority support'], 1),
  ('vip2',    'VIP 2',   400, 25, 3, ARRAY['5 surveys every day','R 25 per survey','Withdraw every 3 days','Priority support','Bonus missions'], 2),
  ('vip3',    'VIP 3',   900, 50, 1, ARRAY['5 surveys every day','R 50 per survey','Withdraw every day','VIP support','Bonus missions','Top leaderboard rewards'], 3) ON CONFLICT (tier) DO NOTHING;

-- SEED SETTINGS
INSERT INTO public.app_settings (key, value) VALUES ('welcome_bonus_kes', '25'),
  ('surveys_per_day', '5'),
  ('min_withdrawal_kes', '100'),
  ('hold_amount_kes', '50'),
  ('kyc_hold_amount_kes', '50'),
  ('referral_target', '5'),
  ('referral_reward_tier', '"vip1"'),
  ('referral_commission_kes', '0'),
  ('streak_bonus_kes', '5'),
  ('require_kyc_for_withdrawal', 'true'),
  ('whatsapp_group_url', '""'),
  ('platform_name', '"TikTok Reward Coin"') ON CONFLICT (key) DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- SURVEYS
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  min_tier public.plan_tier NOT NULL DEFAULT 'regular',
  estimated_minutes INTEGER NOT NULL DEFAULT 3,
  status public.survey_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  type public.question_type NOT NULL DEFAULT 'single_choice',
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  required BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.response_status NOT NULL DEFAULT 'in_progress',
  reward_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (survey_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
);
GRANT SELECT, INSERT, UPDATE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- EARNINGS
CREATE TABLE IF NOT EXISTS public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.earning_type NOT NULL,
  amount_kes NUMERIC(12,2) NOT NULL,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.earnings TO authenticated;
GRANT ALL ON public.earnings TO service_role;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

-- WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kes NUMERIC(12,2) NOT NULL,
  phone TEXT NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- CHARGES (M-Pesa holds / upgrades)
CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose public.charge_purpose NOT NULL,
  target_tier public.plan_tier,
  amount_kes NUMERIC(12,2) NOT NULL,
  phone TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'mpesa',
  status public.charge_status NOT NULL DEFAULT 'pending',
  provider_charge_id TEXT UNIQUE,
  provider_transaction_id TEXT,
  failure_reason TEXT,
  reverted_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- KYC
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.kyc_kind NOT NULL DEFAULT 'documents',
  status public.kyc_status NOT NULL DEFAULT 'requested',
  instructions TEXT,
  id_front_path TEXT,
  id_back_path TEXT,
  selfie_path TEXT,
  admin_note TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
);
GRANT SELECT, UPDATE ON public.kyc_requests TO authenticated;
GRANT ALL ON public.kyc_requests TO service_role;
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

-- REFERRALS
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  activated BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- DAILY ACTIVITY
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  surveys_completed INTEGER NOT NULL DEFAULT 0,
  earned_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  popup_seen BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, day)
);
GRANT SELECT ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- BADGES
CREATE TABLE IF NOT EXISTS public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- MISSIONS
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily',
  metric TEXT NOT NULL DEFAULT 'surveys_completed',
  goal INTEGER NOT NULL DEFAULT 1,
  reward_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  UNIQUE (user_id, mission_id, period_start)
);
GRANT SELECT ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- BALANCE
CREATE OR REPLACE FUNCTION public.user_balance(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT SUM(amount_kes) FROM public.earnings WHERE user_id = _user_id), 0)
       - COALESCE((SELECT SUM(amount_kes) FROM public.withdrawals
                    WHERE user_id = _user_id AND status IN ('pending','approved','paid')), 0)
$$;
REVOKE EXECUTE ON FUNCTION public.user_balance(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_balance(UUID) TO authenticated;

DROP TRIGGER IF EXISTS surveys_updated_at ON public.surveys;
CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS charges_updated_at ON public.charges;
CREATE TRIGGER charges_updated_at BEFORE UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POLICIES
DROP POLICY IF EXISTS "surveys_read_active" ON public.surveys;
CREATE POLICY "surveys_read_active" ON public.surveys FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public.is_admin());
DROP POLICY IF EXISTS "surveys_admin_write" ON public.surveys;
CREATE POLICY "surveys_admin_write" ON public.surveys FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "questions_read" ON public.questions;
CREATE POLICY "questions_read" ON public.questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.status = 'active') OR public.is_admin());
DROP POLICY IF EXISTS "questions_admin_write" ON public.questions;
CREATE POLICY "questions_admin_write" ON public.questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "responses_own" ON public.responses;
CREATE POLICY "responses_own" ON public.responses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "responses_insert_own" ON public.responses;
CREATE POLICY "responses_insert_own" ON public.responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "responses_update_own" ON public.responses;
CREATE POLICY "responses_update_own" ON public.responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "answers_own" ON public.answers;
CREATE POLICY "answers_own" ON public.answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS "answers_insert_own" ON public.answers;
CREATE POLICY "answers_insert_own" ON public.answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()));
DROP POLICY IF EXISTS "answers_update_own" ON public.answers;
CREATE POLICY "answers_update_own" ON public.answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "earnings_own" ON public.earnings;
CREATE POLICY "earnings_own" ON public.earnings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "withdrawals_own" ON public.withdrawals;
CREATE POLICY "withdrawals_own" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "charges_own" ON public.charges;
CREATE POLICY "charges_own" ON public.charges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "kyc_own_read" ON public.kyc_requests;
CREATE POLICY "kyc_own_read" ON public.kyc_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "kyc_own_update" ON public.kyc_requests;
CREATE POLICY "kyc_own_update" ON public.kyc_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "referrals_own" ON public.referrals;
CREATE POLICY "referrals_own" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "activity_own" ON public.daily_activity;
CREATE POLICY "activity_own" ON public.daily_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "badges_read" ON public.badges;
CREATE POLICY "badges_read" ON public.badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "user_badges_own" ON public.user_badges;
CREATE POLICY "user_badges_own" ON public.user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "missions_read" ON public.missions;
CREATE POLICY "missions_read" ON public.missions FOR SELECT TO authenticated USING (active OR public.is_admin());
DROP POLICY IF EXISTS "missions_admin_write" ON public.missions;
CREATE POLICY "missions_admin_write" ON public.missions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "user_missions_own" ON public.user_missions;
CREATE POLICY "user_missions_own" ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- STORAGE bucket and policies for the private kyc bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "kyc_upload_own" ON storage.objects;
CREATE POLICY "kyc_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "kyc_read_own" ON storage.objects;
CREATE POLICY "kyc_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "kyc_update_own" ON storage.objects;
CREATE POLICY "kyc_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

-- SEED BADGES + MISSIONS
INSERT INTO public.badges (code, name, description, icon, sort_order) VALUES
  ('first_survey', 'First Steps', 'Complete your first survey', 'footprints', 1),
  ('daily_five', 'Daily Grinder', 'Complete all 5 surveys in one day', 'flame', 2),
  ('streak_7', 'Week Warrior', 'Keep a 7-day streak', 'calendar-check', 3),
  ('verified', 'Verified', 'Verify your M-Pesa account', 'shield-check', 4),
  ('recruiter', 'Recruiter', 'Invite 5 active friends', 'users', 5),
  ('vip_member', 'VIP Member', 'Upgrade to any VIP plan', 'crown', 6),
  ('surveys_50', 'Half Century', 'Complete 50 surveys', 'trophy', 7),
  ('first_payout', 'Cashed Out', 'Receive your first payout', 'banknote', 8) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.missions (code, title, description, period, metric, goal, reward_kes, sort_order) VALUES
  ('daily_all_surveys', 'Finish today''s surveys', 'Complete all 5 surveys today', 'daily', 'surveys_completed', 5, 25, 1),
  ('daily_three', 'Warm up', 'Complete 3 surveys today', 'daily', 'surveys_completed', 3, 10, 2),
  ('weekly_twenty', 'Weekly hustler', 'Complete 20 surveys this week', 'weekly', 'surveys_completed', 20, 100, 3),
  ('weekly_invite', 'Bring a friend', 'Invite 1 friend who activates this week', 'weekly', 'referrals_activated', 1, 50, 4) ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE s uuid;
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.surveys) THEN

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Mobile money habits in Kenya','Tell us how you use M-Pesa and other wallets every week.','Finance','regular',3,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','How often do you use mobile money in a week?','["Daily","2-3 times","Once","Rarely"]',true,0),
 (s,'multi_choice','Which services do you use most?','["Send money","Buy airtime","Pay bills","Savings","Loans"]',true,1),
 (s,'scale','How satisfied are you with transaction fees?','[]',true,2),
 (s,'text','What would you improve about mobile money?','[]',false,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Your daily commute in Nairobi','Matatus, boda bodas or walking? Help transport planners.','Transport','regular',3,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','What is your main means of transport?','["Matatu","Boda boda","Personal car","Walking","Train"]',true,0),
 (s,'number','How much do you spend on transport per day (KES)?','[]',true,1),
 (s,'scale','Rate the reliability of your usual route','[]',true,2);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Shopping and household basics','Where and how you buy food and household items.','Retail','regular',4,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Where do you buy most groceries?','["Local kiosk","Open market","Supermarket","Online"]',true,0),
 (s,'multi_choice','Which brands do you buy monthly?','["Unga","Cooking oil","Tea leaves","Soap","Milk"]',true,1),
 (s,'text','Which product is hardest to find near you?','[]',false,2);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Smartphone and data usage','A short study on phones, data bundles and apps.','Technology','vip1',4,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Which network do you use for data?','["Safaricom","Airtel","Telkom","Other"]',true,0),
 (s,'number','How much do you spend on bundles per month (KES)?','[]',true,1),
 (s,'multi_choice','Which apps do you open daily?','["WhatsApp","TikTok","Facebook","YouTube","Banking app"]',true,2),
 (s,'scale','Rate your network speed','[]',true,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Banking and savings behaviour','Deeper study on saving, borrowing and chamas.','Finance','vip2',5,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Do you belong to a chama or SACCO?','["Yes, chama","Yes, SACCO","Both","Neither"]',true,0),
 (s,'scale','How confident are you about your savings plan?','[]',true,1),
 (s,'multi_choice','Which loan sources have you used?','["Bank","Mobile loan app","Shylock","Family","None"]',true,2),
 (s,'text','What stops you from saving more?','[]',false,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Premium brand and media panel','Top-paying study on advertising recall and media habits.','Media','vip3',6,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'multi_choice','Where do you see most adverts?','["TV","Radio","Billboards","Social media","Matatu screens"]',true,0),
 (s,'single_choice','Which advert do you remember best this month?','["Telco","Bank","Beverage","Betting","None"]',true,1),
 (s,'scale','How much do adverts influence your purchases?','[]',true,2),
 (s,'text','Describe an advert that stood out and why.','[]',false,3);

END IF;
END $$;-- One survey per day
UPDATE public.app_settings SET value = '1'::jsonb, updated_at = now() WHERE key = 'surveys_per_day';

-- Secure integration credentials (service role only; no RLS policies on purpose)
CREATE TABLE IF NOT EXISTS public.secure_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.secure_settings TO service_role;
ALTER TABLE public.secure_settings ENABLE ROW LEVEL SECURITY;

-- Retire the old starter bank and publish 7 daily surveys per plan, 5 questions each
UPDATE public.surveys SET status = 'closed', updated_at = now() WHERE status = 'active';

WITH cats(cat, mins, title, descr) AS (VALUES
  ('Mobile money', 3, 'Day 1 · Mobile money habits', 'Five quick questions about how you send and receive money.'),
  ('Transport', 3, 'Day 2 · Getting around town', 'Five quick questions about your daily travel.'),
  ('Shopping', 3, 'Day 3 · Where you shop', 'Five quick questions about groceries and household shopping.'),
  ('Technology', 4, 'Day 4 · Phones and data', 'Five quick questions about your phone, data and apps.'),
  ('Banking', 4, 'Day 5 · Saving and borrowing', 'Five quick questions about savings, loans and banks.'),
  ('Media', 3, 'Day 6 · What you watch and listen to', 'Five quick questions about TV, radio and social media.'),
  ('Food & drink', 3, 'Day 7 · Food and drinks', 'Five quick questions about eating out and favourite brands.')
), tiers(tier, label) AS (VALUES
  ('regular', 'Regular'), ('vip1', 'VIP1'), ('vip2', 'VIP2'), ('vip3', 'VIP3')
), new_surveys AS (
  INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
  SELECT cats.title || ' — ' || tiers.label, cats.descr, cats.cat, tiers.tier::plan_tier, cats.mins, 'active'
  FROM cats CROSS JOIN tiers
  RETURNING id, category
), q(cat, pos, qtype, qtext, opts) AS (VALUES
  ('Mobile money', 1, 'single_choice', 'Which mobile money service do you use most?', '["M-Pesa","Airtel Money","T-Kash","Bank app","None"]'),
  ('Mobile money', 2, 'single_choice', 'How often do you send money in a typical week?', '["Daily","2-3 times","Once","Rarely","Never"]'),
  ('Mobile money', 3, 'single_choice', 'What do you use it for most?', '["Family support","Paying bills","Business payments","Savings","Airtime"]'),
  ('Mobile money', 4, 'scale', 'How satisfied are you with the transaction fees? (1-5)', '[]'),
  ('Mobile money', 5, 'text', 'What would you improve about mobile money in Kenya?', '[]'),

  ('Transport', 1, 'single_choice', 'How do you usually travel to work or school?', '["Matatu","Boda boda","Walking","Own car","Bus"]'),
  ('Transport', 2, 'single_choice', 'How much do you spend on transport per day?', '["Under KSh 100","KSh 100-200","KSh 200-400","KSh 400-800","Over KSh 800"]'),
  ('Transport', 3, 'single_choice', 'Have you used a ride-hailing app in the last month?', '["Yes, often","Yes, once or twice","No","I do not know these apps"]'),
  ('Transport', 4, 'scale', 'Rate the reliability of public transport near you (1-5)', '[]'),
  ('Transport', 5, 'text', 'What is your biggest transport frustration?', '[]'),

  ('Shopping', 1, 'single_choice', 'Where do you buy most of your groceries?', '["Local kiosk","Open market","Supermarket","Wholesale shop","Online"]'),
  ('Shopping', 2, 'single_choice', 'How often do you shop for household items?', '["Daily","Weekly","Twice a month","Monthly"]'),
  ('Shopping', 3, 'multi_choice', 'Which of these do you buy every month?', '["Cooking oil","Maize flour","Soap","Milk","Sugar","Airtime"]'),
  ('Shopping', 4, 'scale', 'How important are discounts when you choose a shop? (1-5)', '[]'),
  ('Shopping', 5, 'text', 'Which shop gives you the best value and why?', '[]'),

  ('Technology', 1, 'single_choice', 'What kind of phone do you use?', '["Android smartphone","iPhone","Feature phone","Two or more phones"]'),
  ('Technology', 2, 'single_choice', 'How do you buy internet data?', '["Daily bundles","Weekly bundles","Monthly bundles","Home WiFi","Free WiFi"]'),
  ('Technology', 3, 'multi_choice', 'Which apps do you open every day?', '["WhatsApp","Facebook","TikTok","YouTube","X (Twitter)","Instagram"]'),
  ('Technology', 4, 'number', 'How many hours per day do you spend online?', '[]'),
  ('Technology', 5, 'text', 'What app do you wish existed in Kenya?', '[]'),

  ('Banking', 1, 'single_choice', 'Do you have a bank account?', '["Yes, one","Yes, more than one","No","Only a SACCO account"]'),
  ('Banking', 2, 'single_choice', 'How do you usually save money?', '["Mobile money","Bank account","SACCO","Chama group","At home"]'),
  ('Banking', 3, 'single_choice', 'Have you taken a digital loan in the last year?', '["Yes","No","I prefer not to say"]'),
  ('Banking', 4, 'scale', 'How confident do you feel about your savings? (1-5)', '[]'),
  ('Banking', 5, 'text', 'What would help you save more each month?', '[]'),

  ('Media', 1, 'single_choice', 'Where do you get most of your news?', '["Social media","TV","Radio","Online news sites","Friends and family"]'),
  ('Media', 2, 'multi_choice', 'Which platforms do you use for entertainment?', '["TikTok","YouTube","Netflix","Showmax","Local TV","Radio"]'),
  ('Media', 3, 'single_choice', 'How many hours of video do you watch per day?', '["Less than 1","1-2","2-4","More than 4"]'),
  ('Media', 4, 'scale', 'Rate how much you trust adverts you see online (1-5)', '[]'),
  ('Media', 5, 'text', 'Which Kenyan creator or show do you follow most?', '[]'),

  ('Food & drink', 1, 'single_choice', 'How often do you eat food prepared outside home?', '["Daily","A few times a week","Weekly","Rarely"]'),
  ('Food & drink', 2, 'single_choice', 'What is your usual lunch spend?', '["Under KSh 100","KSh 100-250","KSh 250-500","Over KSh 500"]'),
  ('Food & drink', 3, 'multi_choice', 'Which drinks do you buy most?', '["Soda","Bottled water","Juice","Tea or coffee","Energy drinks"]'),
  ('Food & drink', 4, 'scale', 'How important is brand when buying food? (1-5)', '[]'),
  ('Food & drink', 5, 'text', 'Which local food brand do you trust most?', '[]')
)
INSERT INTO public.questions (survey_id, type, text, options, required, position)
SELECT ns.id, q.qtype::question_type, q.qtext, q.opts::jsonb, true, q.pos
FROM new_surveys ns JOIN q ON q.cat = ns.category;

INSERT INTO public.app_settings (key, value) VALUES ('kyc_hold_amount_kes', '100') ON CONFLICT (key) DO NOTHING;