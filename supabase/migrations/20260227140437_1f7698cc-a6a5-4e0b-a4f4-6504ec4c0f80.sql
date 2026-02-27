
-- Add longest_streak column
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;

-- Backfill: set longest_streak = current_streak where it's higher
UPDATE public.streaks SET longest_streak = current_streak WHERE current_streak > longest_streak;

-- Update the streak trigger to track longest_streak
CREATE OR REPLACE FUNCTION public.update_streak_on_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_new_streak integer;
BEGIN
  IF NEW.confirmed_at IS NULL THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.confirmed_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_streak FROM public.streaks WHERE user_id = NEW.user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_posted_date, grace_used)
    VALUES (NEW.user_id, 1, 1, v_today, false);
    RETURN NEW;
  END IF;

  IF v_streak.last_posted_date = v_today THEN
    RETURN NEW;
  ELSIF v_streak.last_posted_date = v_today - 1 THEN
    v_new_streak := v_streak.current_streak + 1;
    UPDATE public.streaks
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_streak.longest_streak, v_new_streak),
        last_posted_date = v_today,
        grace_used = false,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF v_streak.last_posted_date = v_today - 2 AND NOT v_streak.grace_used THEN
    v_new_streak := v_streak.current_streak + 1;
    UPDATE public.streaks
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_streak.longest_streak, v_new_streak),
        last_posted_date = v_today,
        grace_used = true,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.streaks
    SET current_streak = 1,
        last_posted_date = v_today,
        grace_used = false,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow anyone to read streaks (needed for avatar ring indicators on other profiles)
DROP POLICY IF EXISTS "Users see own streak" ON public.streaks;
CREATE POLICY "Anyone can view streaks"
  ON public.streaks FOR SELECT
  USING (true);
