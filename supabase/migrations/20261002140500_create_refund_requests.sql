-- REFUND REQUESTS & SETTLEMENT MANAGEMENT
DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_number SERIAL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  amount_cents BIGINT NOT NULL,
  transaction_ref TEXT,
  reason TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  account_type TEXT DEFAULT 'cheque',
  status public.refund_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast indexing for filtering and user history
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at DESC);

-- Grants & Row Level Security
GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refunds_read_own_or_admin" ON public.refund_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "refunds_insert_own" ON public.refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "refunds_admin_update" ON public.refund_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
