import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Settings, Calendar, Archive } from "lucide-react";
import { format } from "date-fns";
import RitualAvatar from "@/components/RitualAvatar";

interface PostDay {
  date: string;
  image_url: string | null;
}

export default function Profile() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostDay[]>([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
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
    const { count: total } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).not("confirmed_at", "is", null);
    setTotalPosts(total || 0);
    const { data: streakData } = await supabase.from("streaks").select("current_streak, longest_streak, grace_used").eq("user_id", user.id).single();
    setStreak(streakData?.current_streak || 0);
    setLongestStreak((streakData as any)?.longest_streak || 0);
    setGraceUsed(streakData?.grace_used || false);
    const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).eq("status", "accepted");
    setFollowersCount(followers || 0);
    const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id).eq("status", "accepted");
    setFollowingCount(following || 0);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header — tighter 8pt grid */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <RitualAvatar
              src={profile.avatar_url}
              fallback={profile.username?.[0]?.toUpperCase()}
              streak={streak}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-serif font-bold text-foreground">{profile.display_name || profile.username}</h1>
              <p className="text-meta mt-0.5">@{profile.username}</p>
            </div>
          </div>
          <button onClick={() => navigate("/settings")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all tap-scale">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {profile.bio && (
          <p className="text-[15px] text-foreground/80 mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats row — confident sizing */}
        <div className="flex gap-8 mb-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{totalPosts}</p>
            <p className="text-meta mt-0.5">Items</p>
          </div>
          <button onClick={() => navigate(`/user/${user!.id}/followers`)} className="text-center tap-scale">
            <p className="text-lg font-semibold text-foreground">{followersCount}</p>
            <p className="text-meta mt-0.5">Followers</p>
          </button>
          <button onClick={() => navigate(`/user/${user!.id}/following`)} className="text-center tap-scale">
            <p className="text-lg font-semibold text-foreground">{followingCount}</p>
            <p className="text-meta mt-0.5">Following</p>
          </button>
        </div>

        {/* Streak — quiet continuity numbers */}
        {streak > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <p className="text-[13px]">
              <span className="font-bold text-foreground">{streak}</span>{" "}
              <span className="text-muted-foreground">day{streak !== 1 ? "s" : ""}</span>
            </p>
            {longestStreak > 0 && longestStreak >= streak && (
              <p className="text-[13px]">
                <span className="text-muted-foreground">best:</span>{" "}
                <span className="font-bold text-foreground">{longestStreak}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-5 text-meta">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Joined {format(new Date(profile.created_at), "MMM yyyy")}</span>
          </div>
          <button onClick={() => navigate("/archive")} className="flex items-center gap-1.5 hover:text-foreground transition-colors tap-scale">
            <Archive className="h-3.5 w-3.5" />
            <span>Prompt Archive</span>
          </button>
        </div>
      </div>

      {/* Last 7 days grid — card surface with visible elevation */}
      <div className="mx-4 mb-4 p-4 surface-card border border-border">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">Last 7 days</p>
        <div className="grid grid-cols-7 gap-2">
          {posts.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-secondary">
                {day.image_url ? (
                  <img src={day.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-border" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {format(new Date(day.date), "EEE")}
              </span>
            </div>
          ))}
        </div>
        {/* Continuity line */}
        <div className="grid grid-cols-7 gap-2 mt-2">
          {posts.map((day) => (
            <div
              key={`line-${day.date}`}
              className={`h-[3px] rounded-full ${day.image_url ? "bg-primary/40" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
