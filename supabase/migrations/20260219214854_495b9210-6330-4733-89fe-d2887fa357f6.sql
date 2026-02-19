
-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Validation trigger: extensible reaction types
CREATE OR REPLACE FUNCTION public.validate_reaction_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reaction_type NOT IN ('up', 'down', 'left', 'right') THEN
    RAISE EXCEPTION 'Invalid reaction_type: %', NEW.reaction_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_reaction_type
  BEFORE INSERT OR UPDATE ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reaction_type();

-- Updated_at trigger
CREATE TRIGGER update_post_reactions_updated_at
  BEFORE UPDATE ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Prevent self-reaction via trigger
CREATE OR REPLACE FUNCTION public.prevent_self_reaction()
  RETURNS trigger
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT user_id INTO v_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF v_owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'Cannot react to your own post';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_prevent_self_reaction
  BEFORE INSERT OR UPDATE ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_reaction();

-- RLS Policies
-- Users can see reactions on posts they can view
CREATE POLICY "Users see reactions on visible posts"
  ON public.post_reactions
  FOR SELECT
  USING (can_view_post(post_id, auth.uid()));

-- Users can insert their own reaction
CREATE POLICY "Users insert own reaction"
  ON public.post_reactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own reaction
CREATE POLICY "Users update own reaction"
  ON public.post_reactions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own reaction
CREATE POLICY "Users delete own reaction"
  ON public.post_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_post ON public.post_reactions(user_id, post_id);
