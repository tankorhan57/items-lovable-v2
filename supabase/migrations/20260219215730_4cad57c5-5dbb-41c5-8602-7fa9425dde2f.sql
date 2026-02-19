
-- User reaction configuration table
CREATE TABLE public.user_reaction_config (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'direction',
  mapping JSONB NOT NULL DEFAULT '{"up":"up","down":"down","left":"left","right":"right"}'::jsonb,
  animation_preset_mapping JSONB NOT NULL DEFAULT '{"up":"pop","down":"pop","left":"slide","right":"slide"}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation trigger for mode
CREATE OR REPLACE FUNCTION public.validate_reaction_config()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mode NOT IN ('direction', 'corner') THEN
    RAISE EXCEPTION 'Invalid mode: %. Must be direction or corner', NEW.mode;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_reaction_config
  BEFORE INSERT OR UPDATE ON public.user_reaction_config
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reaction_config();

-- Updated_at trigger
CREATE TRIGGER update_user_reaction_config_updated_at
  BEFORE UPDATE ON public.user_reaction_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.user_reaction_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own config"
  ON public.user_reaction_config FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own config"
  ON public.user_reaction_config FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own config"
  ON public.user_reaction_config FOR UPDATE
  USING (user_id = auth.uid());

-- Rate limiting for reactions (max 30 reactions per 5 minutes)
CREATE OR REPLACE FUNCTION public.enforce_rate_limit_reaction()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_since timestamptz := now() - interval '5 minutes';
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.post_reactions
  WHERE user_id = NEW.user_id AND updated_at > v_since;
  IF v_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded for reactions';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_rate_limit_reaction
  BEFORE INSERT OR UPDATE ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_rate_limit_reaction();
