import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Settings, Calendar, Flame } from "lucide-react";
import { format } from "date-fns";

interface PostDay {
  date: string;
  image_url: string | null;
}

export default function Profile() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostDay[]>([]);
  const [streak, setStreak] = useState(0);
  const [graceUsed, setGraceUsed] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    const days: PostDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split("T")[0], image_url: null });
    }

    const { data: recentPosts } = await supabase
      .from("posts")
      .select("image_url, created_at, daily_item_id, daily_items!inner(active_date)")
      .eq("user_id", user.id)
      .not("confirmed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (recentPosts) {
      recentPosts.forEach((p: any) => {
        const postDate = p.daily_items?.active_date;
        const day = days.find(d => d.date === postDate);
        if (day) day.image_url = p.image_url;
      });
    }
    setPosts(days);

    const { count: total } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("confirmed_at", "is", null);
    setTotalPosts(total || 0);

    const { data: streakData } = await supabase
      .from("streaks")
      .select("current_streak, grace_used")
      .eq("user_id", user.id)
      .single();
    setStreak(streakData?.current_streak || 0);
    setGraceUsed(streakData?.grace_used || false);

    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id)
      .eq("status", "accepted");
    setFollowersCount(followers || 0);

    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .eq("status", "accepted");
    setFollowingCount(following || 0);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-serif text-muted-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-serif text-foreground">{profile.display_name || profile.username}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          <button onClick={() => navigate("/settings")} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {profile.bio && (
          <p className="text-sm text-foreground/80 mb-5">{profile.bio}</p>
        )}

        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-lg font-serif text-foreground">{totalPosts}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</p>
          </div>
          <button onClick={() => navigate(`/user/${user!.id}/followers`)} className="text-center">
            <p className="text-lg font-serif text-foreground">{followersCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Followers</p>
          </button>
          <button onClick={() => navigate(`/user/${user!.id}/following`)} className="text-center">
            <p className="text-lg font-serif text-foreground">{followingCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Following</p>
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-lg font-serif text-foreground">{streak}</p>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Streak{graceUsed ? " ⏸" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Calendar className="h-3.5 w-3.5" />
          <span>Joined {format(new Date(profile.created_at), "MMM yyyy")}</span>
        </div>
      </div>

      <div className="px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Last 7 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {posts.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {day.image_url ? (
                  <img src={day.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1 w-1 rounded-full bg-border" />
                  </div>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {format(new Date(day.date), "EEE")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
