-- Table to store each user's daily posting window
CREATE TABLE public.daily_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  active_date DATE NOT NULL,
  window_start_hour INTEGER NOT NULL,
  window_end_hour INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, active_date)
);

ALTER TABLE public.daily_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own windows"
  ON public.daily_windows FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own windows"
  ON public.daily_windows FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_daily_windows_user_date ON public.daily_windows (user_id, active_date);