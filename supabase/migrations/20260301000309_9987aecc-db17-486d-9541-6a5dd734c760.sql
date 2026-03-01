
-- Fix profiles: require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix streaks: require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view streaks" ON public.streaks;
CREATE POLICY "Authenticated users can view streaks"
  ON public.streaks FOR SELECT
  USING (auth.uid() IS NOT NULL);
