
-- ============================================
-- 1. LOCK DOWN STREAKS: Remove client UPDATE policy
-- ============================================
DROP POLICY IF EXISTS "Users update own streak" ON public.streaks;

-- Ensure streaks INSERT is also blocked (already no policy, but be explicit)
-- The trigger update_streak_on_post uses SECURITY DEFINER so it bypasses RLS

-- ============================================
-- 2. USERNAME UNIQUENESS (case-insensitive)
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- ============================================
-- 3. SOFT DELETE for posts
-- ============================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update can_view_post to exclude soft-deleted posts
CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id uuid, p_viewer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post RECORD;
  v_profile RECORD;
BEGIN
  SELECT p.user_id, p.confirmed_at, p.deleted_at, di.active_date
  INTO v_post
  FROM public.posts p
  JOIN public.daily_items di ON di.id = p.daily_item_id
  WHERE p.id = p_post_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_post.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF v_post.confirmed_at IS NULL THEN RETURN v_post.user_id = p_viewer_id; END IF;
  IF v_post.user_id = p_viewer_id THEN RETURN true; END IF;

  SELECT is_private INTO v_profile FROM public.profiles WHERE id = v_post.user_id;

  IF public.is_following(p_viewer_id, v_post.user_id) THEN
    RETURN v_post.active_date >= (CURRENT_DATE - INTERVAL '10 days');
  END IF;

  IF NOT v_profile.is_private THEN
    RETURN v_post.active_date = CURRENT_DATE;
  END IF;

  RETURN false;
END;
$function$;

-- Allow users to soft-delete own posts (update deleted_at only)
DROP POLICY IF EXISTS "Users update own unconfirmed posts" ON public.posts;

CREATE POLICY "Users update own posts"
ON public.posts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. ACTIVITY UNREAD TRACKING
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_activity TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ============================================
-- 5. BASIC RATE LIMITING (server-side function)
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_table text,
  p_max_count int,
  p_window_minutes int
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_since timestamptz := now() - (p_window_minutes || ' minutes')::interval;
BEGIN
  IF p_action = 'appreciate' THEN
    SELECT COUNT(*) INTO v_count FROM public.appreciations
    WHERE user_id = p_user_id AND created_at > v_since;
  ELSIF p_action = 'follow' THEN
    SELECT COUNT(*) INTO v_count FROM public.follows
    WHERE follower_id = p_user_id AND created_at > v_since;
  ELSIF p_action = 'note' THEN
    SELECT COUNT(*) INTO v_count FROM public.private_notes
    WHERE author_id = p_user_id AND created_at > v_since;
  ELSE
    RETURN true;
  END IF;
  
  RETURN v_count < p_max_count;
END;
$function$;

-- Rate limiting triggers
CREATE OR REPLACE FUNCTION public.enforce_rate_limit_appreciation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.check_rate_limit(NEW.user_id, 'appreciate', 'appreciations', 30, 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded for appreciations';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_rate_limit_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.check_rate_limit(NEW.follower_id, 'follow', 'follows', 20, 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded for follows';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_rate_limit_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.check_rate_limit(NEW.author_id, 'note', 'private_notes', 15, 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded for notes';
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach rate limit triggers
DROP TRIGGER IF EXISTS rate_limit_appreciation ON public.appreciations;
CREATE TRIGGER rate_limit_appreciation
BEFORE INSERT ON public.appreciations
FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_appreciation();

DROP TRIGGER IF EXISTS rate_limit_follow ON public.follows;
CREATE TRIGGER rate_limit_follow
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_follow();

DROP TRIGGER IF EXISTS rate_limit_note ON public.private_notes;
CREATE TRIGGER rate_limit_note
BEFORE INSERT ON public.private_notes
FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_note();
