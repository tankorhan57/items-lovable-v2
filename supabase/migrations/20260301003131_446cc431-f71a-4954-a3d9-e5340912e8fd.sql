
-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own subscriptions" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_reminder boolean NOT NULL DEFAULT true,
  reminder_hour integer NOT NULL DEFAULT 9,
  on_appreciation boolean NOT NULL DEFAULT true,
  on_follow boolean NOT NULL DEFAULT true,
  on_note boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification prefs" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own notification prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own notification prefs" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Validation trigger for reminder_hour (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_reminder_hour()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.reminder_hour < 0 OR NEW.reminder_hour > 23 THEN
    RAISE EXCEPTION 'reminder_hour must be between 0 and 23';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_reminder_hour
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.validate_reminder_hour();

-- App config table for VAPID keys (service role only, no public policies)
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No public RLS policies - only accessible via service role
