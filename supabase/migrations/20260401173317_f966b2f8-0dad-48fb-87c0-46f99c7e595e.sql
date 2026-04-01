
-- Create invites table
CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code text NOT NULL UNIQUE,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Users can create their own invites
CREATE POLICY "Users create own invites"
ON public.invites FOR INSERT
TO authenticated
WITH CHECK (inviter_id = auth.uid());

-- Users can view their own invites
CREATE POLICY "Users view own invites"
ON public.invites FOR SELECT
TO authenticated
USING (inviter_id = auth.uid() OR redeemed_by = auth.uid());

-- Allow anyone authenticated to look up invites by code (for redemption)
CREATE POLICY "Anyone can lookup invite by code"
ON public.invites FOR SELECT
TO authenticated
USING (true);

-- Allow update for redemption (service role will handle this, but allow authenticated for edge function)
CREATE POLICY "Redeem invite"
ON public.invites FOR UPDATE
TO authenticated
USING (redeemed_by IS NULL)
WITH CHECK (redeemed_by = auth.uid());

-- Index for fast code lookup
CREATE INDEX idx_invites_code ON public.invites(invite_code);
CREATE INDEX idx_invites_inviter ON public.invites(inviter_id);
