-- Indexes to eliminate sequential table scans and protect Disk IO Budget

-- Earnings: heavily queried by user_id for balance & history
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON public.earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON public.earnings(created_at DESC);

-- Withdrawals: heavily queried by user_id, status, and requested_at
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON public.withdrawals(requested_at DESC);

-- Charges: queried by user_id and status
CREATE INDEX IF NOT EXISTS idx_charges_user_id ON public.charges(user_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON public.charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_user_status ON public.charges(user_id, status);

-- Daily Activity: queried by user_id and day
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_day ON public.daily_activity(user_id, day);

-- Responses & Surveys
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON public.responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_survey ON public.responses(user_id, survey_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys(status);

-- KYC Requests
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON public.kyc_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON public.kyc_requests(status);

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
