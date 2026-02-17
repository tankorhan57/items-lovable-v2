
-- Allow authenticated users to insert activity records
CREATE POLICY "Users create activity"
ON public.activity FOR INSERT
WITH CHECK (actor_id = auth.uid());

-- Add unique constraint on appreciations to enforce one per user per post
ALTER TABLE public.appreciations ADD CONSTRAINT appreciations_user_post_unique UNIQUE (user_id, post_id);

-- Add unique constraint on follows to prevent duplicate follow rows
ALTER TABLE public.follows ADD CONSTRAINT follows_unique UNIQUE (follower_id, following_id);

-- Create a function to update streaks server-side
CREATE OR REPLACE FUNCTION public.update_streak_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Only trigger on confirmation
  IF NEW.confirmed_at IS NULL THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.confirmed_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_streak FROM public.streaks WHERE user_id = NEW.user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, last_posted_date, grace_used)
    VALUES (NEW.user_id, 1, v_today, false);
    RETURN NEW;
  END IF;

  IF v_streak.last_posted_date = v_today THEN
    -- Already posted today
    RETURN NEW;
  ELSIF v_streak.last_posted_date = v_today - 1 THEN
    -- Consecutive day
    UPDATE public.streaks
    SET current_streak = v_streak.current_streak + 1,
        last_posted_date = v_today,
        grace_used = false,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF v_streak.last_posted_date = v_today - 2 AND NOT v_streak.grace_used THEN
    -- 1 day missed, grace pause
    UPDATE public.streaks
    SET current_streak = v_streak.current_streak + 1,
        last_posted_date = v_today,
        grace_used = true,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    -- Reset streak
    UPDATE public.streaks
    SET current_streak = 1,
        last_posted_date = v_today,
        grace_used = false,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for streak updates
CREATE TRIGGER update_streak_after_post
AFTER INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_post();

-- Allow private_notes to be read by post owner too (for thread)
DROP POLICY IF EXISTS "Users see own notes" ON public.private_notes;
CREATE POLICY "Users see notes they sent or received"
ON public.private_notes FOR SELECT
USING (
  author_id = auth.uid() OR
  post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
);
