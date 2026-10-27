-- SUPPORT TICKETS & REPLIES
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_review', 'answered', 'resolved');
CREATE TYPE public.ticket_category AS ENUM ('payout_withdrawal', 'verification_fica', 'daily_tasks', 'account_upgrade', 'general');

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  category public.ticket_category NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Permissions & RLS
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_read_own_or_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tickets_admin_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
