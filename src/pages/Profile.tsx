import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Settings, Calendar, Archive, CheckCircle, Camera } from "lucide-react";
import StreakDisplay from "@/components/StreakDisplay";
import ShareButton from "@/components/ShareButton";
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
  const [lastPostedDate, setLastPostedDate] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
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

    // Check if posted today
    const postedToday = days.find(d => d.date === today)?.image_url != null;
    setHasPostedToday(postedToday);

    // Check window
    if (!postedToday) {
      const { data: win } = await supabase
        .from("daily_windows")
        .select("window_start_hour, window_end_hour")
        .eq("user_id", user.id)
        .eq("active_date", today)
        .maybeSingle();
      if (win) {
        const h = new Date().getHours();
        setWindowOpen(h >= win.window_start_hour && h < win.window_end_hour);
      }
    }

    const { count: total } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).not("confirmed_at", "is", null);
    setTotalPosts(total || 0);
    const { data: streakData } = await supabase.from("streaks").select("current_streak, longest_streak, grace_used, last_posted_date").eq("user_id", user.id).single();
    setStreak(streakData?.current_streak || 0);
    setLongestStreak((streakData as any)?.longest_streak || 0);
    setGraceUsed(streakData?.grace_used || false);
    setLastPostedDate(streakData?.last_posted_date || null);
    const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).eq("status", "accepted");
    setFollowersCount(followers || 0);
    const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id).eq("status", "accepted");
    setFollowingCount(following || 0);
    setLoading(false);
  };

  if (!profile || loading) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <div className="px-5 pt-safe pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center px-4 py-2 rounded-xl bg-card border border-border">
                <div className="h-5 w-8 rounded bg-muted animate-pulse" />
                <div className="h-3 w-14 rounded bg-muted animate-pulse mt-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-4 p-4 surface-card border border-border">
          <div className="h-3 w-20 rounded bg-muted animate-pulse mb-3" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-square w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollY(scrollRef.current.scrollTop);
    }
  }, []);

  const headerOpacity = Math.max(0, 0.08 - scrollY * 0.0004);
  const headerTranslate = scrollY * 0.35;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-screen bg-background animate-fade-in overflow-y-auto"
      style={{ height: "100dvh" }}
    >
      {/* Parallax gradient layer */}
      <div
        className="absolute inset-x-0 top-0 h-[280px] pointer-events-none transition-opacity duration-100"
        style={{
          background: `linear-gradient(to bottom, hsl(9 100% 58% / ${headerOpacity + 0.08}), transparent)`,
          transform: `translateY(-${headerTranslate}px)`,
          willChange: "transform, opacity",
        }}
      />
      {/* Header with warm gradient banner */}
      <div
        ref={headerRef}
        className="relative px-5 pt-safe pb-4"
      >
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
          <div className="flex items-center gap-1">
            <ShareButton
              title="Items"
              text={`Check out @${profile.username} on Items`}
              url={`${window.location.origin}/user/${user!.id}`}
            />
            <button onClick={() => navigate("/settings")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all tap-scale">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {profile.bio && (
          <p className="text-[15px] text-foreground/80 mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Today's status chip */}
        {hasPostedToday ? (
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-[12px] font-semibold" style={{ background: "hsl(9 100% 58% / 0.1)", color: "hsl(9 100% 58%)" }}>
            <CheckCircle className="h-3.5 w-3.5" />
            Posted today
          </div>
        ) : windowOpen ? (
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-[12px] font-semibold bg-secondary text-muted-foreground">
            <Camera className="h-3.5 w-3.5" />
            Capture window open
          </div>
        ) : null}

        {/* Stats row as pill containers */}
        <div className="flex gap-3 justify-center mb-4">
          <div className="stagger-item flex flex-col items-center px-4 py-2 rounded-xl bg-card border border-border">
            <p className="text-lg font-bold text-foreground">{totalPosts}</p>
            <p className="text-[11px] text-muted-foreground">Items</p>
          </div>
          <button onClick={() => navigate(`/user/${user!.id}/followers`)} className="stagger-item flex flex-col items-center px-4 py-2 rounded-xl bg-card border border-border tap-scale">
            <p className="text-lg font-bold text-foreground">{followersCount}</p>
            <p className="text-[11px] text-muted-foreground">Followers</p>
          </button>
          <button onClick={() => navigate(`/user/${user!.id}/following`)} className="stagger-item flex flex-col items-center px-4 py-2 rounded-xl bg-card border border-border tap-scale">
            <p className="text-lg font-bold text-foreground">{followingCount}</p>
            <p className="text-[11px] text-muted-foreground">Following</p>
          </button>
        </div>

        <StreakDisplay
          streak={streak}
          longestStreak={longestStreak}
          graceUsed={graceUsed}
          lastPostedDate={lastPostedDate}
        />

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

      {/* Last 7 days grid */}
      <div className="mx-4 mb-4 p-4 surface-card border border-border">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">Last 7 days</p>
        <div className="grid grid-cols-7 gap-2">
          {posts.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <div
                className="aspect-square w-full overflow-hidden rounded-xl transition-all duration-150 ease-out"
                style={
                  day.image_url
                    ? { cursor: "pointer" }
                    : { border: "1.5px dashed hsl(var(--border))", borderRadius: "12px", opacity: 0.5 }
                }
                onMouseEnter={(e) => {
                  if (day.image_url) {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px hsl(9 100% 58% / 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                {day.image_url ? (
                  <img src={day.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-secondary">
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
