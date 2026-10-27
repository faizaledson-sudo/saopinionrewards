REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- SURVEYS
CREATE TABLE public.surveys (
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

CREATE TABLE public.questions (
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

CREATE TABLE public.responses (
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

CREATE TABLE public.answers (
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
CREATE TABLE public.earnings (
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
CREATE TABLE public.withdrawals (
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
CREATE TABLE public.charges (
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
CREATE TABLE public.kyc_requests (
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
CREATE TABLE public.referrals (
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
CREATE TABLE public.daily_activity (
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
CREATE TABLE public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_badges (
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
CREATE TABLE public.missions (
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

CREATE TABLE public.user_missions (
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

CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER charges_updated_at BEFORE UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POLICIES
CREATE POLICY "surveys_read_active" ON public.surveys FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public.is_admin());
CREATE POLICY "surveys_admin_write" ON public.surveys FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "questions_read" ON public.questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.status = 'active') OR public.is_admin());
CREATE POLICY "questions_admin_write" ON public.questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "responses_own" ON public.responses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "responses_insert_own" ON public.responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "responses_update_own" ON public.responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "answers_own" ON public.answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "answers_insert_own" ON public.answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()));
CREATE POLICY "answers_update_own" ON public.answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid()));

CREATE POLICY "earnings_own" ON public.earnings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "withdrawals_own" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "charges_own" ON public.charges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "kyc_own_read" ON public.kyc_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "kyc_own_update" ON public.kyc_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "referrals_own" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin());
CREATE POLICY "activity_own" ON public.daily_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "badges_read" ON public.badges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "user_badges_own" ON public.user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "missions_read" ON public.missions FOR SELECT TO authenticated USING (active OR public.is_admin());
CREATE POLICY "missions_admin_write" ON public.missions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "user_missions_own" ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- STORAGE policies for the private kyc bucket
CREATE POLICY "kyc_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
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
  ('first_payout', 'Cashed Out', 'Receive your first payout', 'banknote', 8);

INSERT INTO public.missions (code, title, description, period, metric, goal, reward_kes, sort_order) VALUES
  ('daily_all_surveys', 'Finish today''s surveys', 'Complete all 5 surveys today', 'daily', 'surveys_completed', 5, 25, 1),
  ('daily_three', 'Warm up', 'Complete 3 surveys today', 'daily', 'surveys_completed', 3, 10, 2),
  ('weekly_twenty', 'Weekly hustler', 'Complete 20 surveys this week', 'weekly', 'surveys_completed', 20, 100, 3),
  ('weekly_invite', 'Bring a friend', 'Invite 1 friend who activates this week', 'weekly', 'referrals_activated', 1, 50, 4);