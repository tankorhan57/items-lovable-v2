import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Lock } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { format } from "date-fns";
import FollowButton from "@/components/FollowButton";
import { Badge } from "@/components/ui/badge";
import RitualAvatar from "@/components/RitualAvatar";
import ReportBlockMenu from "@/components/ReportBlockMenu";

interface UserProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  created_at: string;
}

interface PostDay {
  date: string;
  image_url: string | null;
}

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostDay[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [canView, setCanView] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && user) {
      if (userId === user.id) {
        navigate("/profile", { replace: true });
        return;
      }
      loadProfile();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId || !user) return;
    setLoading(true);

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!p) {
      setLoading(false);
      return;
    }
    setProfileData(p);

    const { data: followData } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();

    const isFollowing = followData?.status === "accepted";
    const viewable = !p.is_private || isFollowing;
    setCanView(viewable);

    const { data: reverseFollow } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", userId)
      .eq("following_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();
    setFollowsYou(!!reverseFollow);

    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId)
      .eq("status", "accepted");
    setFollowersCount(followers || 0);

    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("status", "accepted");
    setFollowingCount(following || 0);

    // Fetch streak data (public read)
    const { data: streakData } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle();
    setStreak(streakData?.current_streak || 0);
    setLongestStreak((streakData as any)?.longest_streak || 0);

    if (viewable) {
      const days: PostDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ date: d.toISOString().split("T")[0], image_url: null });
      }

      const { data: recentPosts } = await supabase
        .from("posts")
        .select("image_url, daily_item_id, daily_items!inner(active_date)")
        .eq("user_id", userId)
        .not("confirmed_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (recentPosts) {
        recentPosts.forEach((post: any) => {
          const postDate = post.daily_items?.active_date;
          const day = days.find(d => d.date === postDate);
          if (day) day.image_url = post.image_url;
        });
      }
      setPosts(days);

      const { count: total } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("confirmed_at", "is", null);
      setTotalPosts(total || 0);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground">User not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-primary">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-safe-sm pb-8">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <RitualAvatar
              src={profileData.avatar_url}
              fallback={profileData.username[0]?.toUpperCase()}
              streak={streak}
              size="lg"
            />
            <div>
              <h1 className="text-lg font-serif">{profileData.display_name || profileData.username}</h1>
              <p className="text-meta mt-0.5">@{profileData.username}</p>
              {followsYou && (
                <Badge variant="secondary" className="text-[10px] mt-1 font-normal">Follows you</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FollowButton
              targetUserId={profileData.id}
              isPrivate={profileData.is_private}
              onStatusChange={loadProfile}
            />
            <ShareButton
              title={`${profileData.display_name || profileData.username} on Items`}
              text={`Check out @${profileData.username} on Items`}
              url={`${window.location.origin}/user/${profileData.id}`}
            />
            <ReportBlockMenu
              targetUserId={profileData.id}
              onBlocked={() => navigate(-1)}
            />
          </div>
        </div>

        {profileData.bio && <p className="text-sm text-foreground/80 mb-6">{profileData.bio}</p>}

        {/* Stats row */}
        <div className="flex gap-6 mb-4">
          {canView && (
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">{totalPosts}</p>
              <p className="text-meta mt-0.5">Items</p>
            </div>
          )}
          <button onClick={() => navigate(`/user/${profileData.id}/followers`)} className="text-center tap-scale">
            <p className="text-base font-semibold text-foreground">{followersCount}</p>
            <p className="text-meta mt-0.5">Followers</p>
          </button>
          <button onClick={() => navigate(`/user/${profileData.id}/following`)} className="text-center tap-scale">
            <p className="text-base font-semibold text-foreground">{followingCount}</p>
            <p className="text-meta mt-0.5">Following</p>
          </button>
        </div>

        {/* Streak — quiet numbers */}
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

        <div className="flex items-center gap-1.5 text-meta">
          <Calendar className="h-3.5 w-3.5" />
          <span>Joined {format(new Date(profileData.created_at), "MMM yyyy")}</span>
        </div>
      </div>

      {canView ? (
        <div className="px-6 pb-8">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Last 7 days</p>
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
          {/* Continuity line */}
          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {posts.map((day) => (
              <div
                key={`line-${day.date}`}
                className={`h-[2px] rounded-full ${day.image_url ? "bg-foreground/30" : "bg-border"}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-3">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg text-foreground mb-1">This account is private</h3>
          <p className="text-meta text-center">
            Follow this user to see their photos.
          </p>
        </div>
      )}
    </div>
  );
}
