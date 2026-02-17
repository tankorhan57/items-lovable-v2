
-- Add ritual depth fields to daily_items
ALTER TABLE public.daily_items
  ADD COLUMN category text NOT NULL DEFAULT 'object',
  ADD COLUMN depth_level integer NOT NULL DEFAULT 1,
  ADD COLUMN tone text NOT NULL DEFAULT 'concrete',
  ADD COLUMN week_number integer;

-- Add validation trigger for category
CREATE OR REPLACE FUNCTION public.validate_daily_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category NOT IN ('color', 'object', 'human', 'perspective', 'emotion', 'time', 'contrast', 'environment') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  IF NEW.depth_level < 1 OR NEW.depth_level > 4 THEN
    RAISE EXCEPTION 'depth_level must be between 1 and 4';
  END IF;
  IF NEW.tone NOT IN ('concrete', 'interpretive', 'reflective') THEN
    RAISE EXCEPTION 'Invalid tone: %', NEW.tone;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_daily_item_trigger
BEFORE INSERT OR UPDATE ON public.daily_items
FOR EACH ROW EXECUTE FUNCTION public.validate_daily_item();
