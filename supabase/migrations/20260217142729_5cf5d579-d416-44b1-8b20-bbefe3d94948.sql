
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Daily items (prompts)
CREATE TABLE public.daily_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  active_date DATE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_items ENABLE ROW LEVEL SECURITY;

-- Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_item_id UUID NOT NULL REFERENCES public.daily_items(id),
  image_url TEXT NOT NULL,
  city TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, daily_item_id)
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Follows
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Appreciations
CREATE TABLE public.appreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.appreciations ENABLE ROW LEVEL SECURITY;

-- Private notes
CREATE TABLE public.private_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;

-- Streaks
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_posted_date DATE,
  grace_used BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Activity
CREATE TABLE public.activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Helper: is_following (accepted)
CREATE OR REPLACE FUNCTION public.is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
      AND status = 'accepted'
  );
$$;

-- Helper: can_view_post
CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id UUID, p_viewer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_profile RECORD;
BEGIN
  SELECT p.user_id, p.confirmed_at, di.active_date
  INTO v_post
  FROM public.posts p
  JOIN public.daily_items di ON di.id = p.daily_item_id
  WHERE p.id = p_post_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_post.confirmed_at IS NULL THEN RETURN v_post.user_id = p_viewer_id; END IF;
  IF v_post.user_id = p_viewer_id THEN RETURN true; END IF;

  SELECT is_private INTO v_profile FROM public.profiles WHERE id = v_post.user_id;

  -- Friends (accepted followers) can see last 10 days
  IF public.is_following(p_viewer_id, v_post.user_id) THEN
    RETURN v_post.active_date >= (CURRENT_DATE - INTERVAL '10 days');
  END IF;

  -- Public profiles: non-friends see only today
  IF NOT v_profile.is_private THEN
    RETURN v_post.active_date = CURRENT_DATE;
  END IF;

  -- Private profiles: non-friends see nothing
  RETURN false;
END;
$$;

-- Helper: has_posted_today
CREATE OR REPLACE FUNCTION public.has_posted_today(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.daily_items di ON di.id = p.daily_item_id
    WHERE p.user_id = p_user_id
      AND p.confirmed_at IS NOT NULL
      AND di.active_date = CURRENT_DATE
  );
$$;

-- RLS: profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- RLS: daily_items (read-only for all authenticated)
CREATE POLICY "Authenticated users can read daily items" ON public.daily_items FOR SELECT TO authenticated USING (true);

-- RLS: posts
CREATE POLICY "Users can view accessible posts" ON public.posts FOR SELECT USING (
  public.can_view_post(id, auth.uid())
);
CREATE POLICY "Users insert own posts" ON public.posts FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users update own unconfirmed posts" ON public.posts FOR UPDATE USING (
  user_id = auth.uid() AND confirmed_at IS NULL
);

-- RLS: follows
CREATE POLICY "Users see own follows" ON public.follows FOR SELECT USING (
  follower_id = auth.uid() OR following_id = auth.uid()
);
CREATE POLICY "Users create follow requests" ON public.follows FOR INSERT WITH CHECK (
  follower_id = auth.uid()
);
CREATE POLICY "Users respond to follow requests" ON public.follows FOR UPDATE USING (
  following_id = auth.uid()
);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (
  follower_id = auth.uid()
);

-- RLS: appreciations
CREATE POLICY "Users see appreciations on visible posts" ON public.appreciations FOR SELECT USING (
  public.can_view_post(post_id, auth.uid())
);
CREATE POLICY "Users create appreciations" ON public.appreciations FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users remove own appreciations" ON public.appreciations FOR DELETE USING (
  user_id = auth.uid()
);

-- RLS: private_notes
CREATE POLICY "Users see own notes" ON public.private_notes FOR SELECT USING (
  author_id = auth.uid()
);
CREATE POLICY "Users create notes" ON public.private_notes FOR INSERT WITH CHECK (
  author_id = auth.uid()
);
CREATE POLICY "Users delete own notes" ON public.private_notes FOR DELETE USING (
  author_id = auth.uid()
);

-- RLS: streaks
CREATE POLICY "Users see own streak" ON public.streaks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own streak" ON public.streaks FOR UPDATE USING (user_id = auth.uid());

-- RLS: activity
CREATE POLICY "Users see own activity" ON public.activity FOR SELECT USING (
  user_id = auth.uid() OR actor_id = auth.uid()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)), ' ', '_')),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'New User')
  );
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_daily_item_id ON public.posts(daily_item_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_activity_user_id ON public.activity(user_id);
CREATE INDEX idx_activity_created_at ON public.activity(created_at DESC);
CREATE INDEX idx_appreciations_post_id ON public.appreciations(post_id);

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Anyone can view post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Auth users upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own post images" ON storage.objects FOR DELETE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed today's daily item
INSERT INTO public.daily_items (prompt_text, active_date)
VALUES ('Something that made you pause today', CURRENT_DATE);
