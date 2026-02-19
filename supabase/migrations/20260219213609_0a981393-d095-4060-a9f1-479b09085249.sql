
CREATE OR REPLACE FUNCTION public.validate_daily_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.category NOT IN ('color', 'object', 'human', 'perspective', 'emotion', 'time', 'contrast', 'environment', 'surface', 'texture', 'movement', 'light') THEN
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
$function$;
