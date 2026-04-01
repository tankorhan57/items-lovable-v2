
-- Create game_results table
CREATE TABLE public.game_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  daily_item_id uuid NOT NULL,
  wrong_guesses integer NOT NULL,
  solved_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one result per user per daily item
ALTER TABLE public.game_results ADD CONSTRAINT game_results_user_daily_unique UNIQUE (user_id, daily_item_id);

-- Index for ranking queries
CREATE INDEX idx_game_results_daily_item ON public.game_results (daily_item_id);

-- Enable RLS
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read results (needed for ranking)
CREATE POLICY "Authenticated users can view game results"
ON public.game_results
FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own results
CREATE POLICY "Users insert own game results"
ON public.game_results
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Ranking RPC function
CREATE OR REPLACE FUNCTION public.get_game_ranking(p_daily_item_id uuid, p_wrong_guesses integer)
RETURNS TABLE(top_percent numeric, avg_wrong numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE 
      WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND((COUNT(*) FILTER (WHERE wrong_guesses > p_wrong_guesses)::numeric / COUNT(*)::numeric) * 100)
    END AS top_percent,
    COALESCE(ROUND(AVG(wrong_guesses)::numeric, 1), p_wrong_guesses::numeric) AS avg_wrong
  FROM public.game_results
  WHERE daily_item_id = p_daily_item_id;
$$;
