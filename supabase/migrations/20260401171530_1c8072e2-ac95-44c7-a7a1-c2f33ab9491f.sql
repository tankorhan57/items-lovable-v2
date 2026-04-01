
-- 1. Add RLS policies to app_config (deny all client access, only service role can read/write)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies = all client access denied. Service role bypasses RLS.

-- 2. Add validation trigger on activity to prevent fake notification injection
-- Validates that the underlying action actually exists before allowing the insert
CREATE OR REPLACE FUNCTION public.validate_activity_insert()
RETURNS trigger
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate type is a known value
  IF NEW.type NOT IN ('appreciation', 'follow', 'follow_request', 'follow_accepted', 'note') THEN
    RAISE EXCEPTION 'Invalid activity type: %', NEW.type;
  END IF;

  -- Validate the underlying relationship exists
  IF NEW.type = 'appreciation' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.appreciations
      WHERE user_id = NEW.actor_id AND post_id = NEW.reference_id::uuid
    ) THEN
      RAISE EXCEPTION 'Cannot create appreciation activity without corresponding appreciation';
    END IF;
  ELSIF NEW.type IN ('follow', 'follow_request') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = NEW.actor_id AND following_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cannot create follow activity without corresponding follow';
    END IF;
  ELSIF NEW.type = 'follow_accepted' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = NEW.user_id AND following_id = NEW.actor_id AND status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Cannot create follow_accepted activity without accepted follow';
    END IF;
  ELSIF NEW.type = 'note' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.private_notes
      WHERE author_id = NEW.actor_id AND post_id = NEW.reference_id::uuid
    ) THEN
      RAISE EXCEPTION 'Cannot create note activity without corresponding note';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_activity_before_insert
  BEFORE INSERT ON public.activity
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_activity_insert();
