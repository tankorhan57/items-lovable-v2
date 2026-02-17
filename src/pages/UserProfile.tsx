import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";
import FollowButton from "@/components/FollowButton";

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
  const [canView, setCanView] = useState(false);
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

    // Check follow status
    const { data: followData } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();

    const isFollowing = followData?.status === "accepted";
    const viewable = !p.is_private || isFollowing;
    setCanView(viewable);

    // Counts
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

    if (viewable) {
      // Load posts for last 7 days
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
      <div className="px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {profileData.avatar_url ? (
                <img src={profileData.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-serif text-muted-foreground">
                  {profileData.username[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-serif text-foreground">{profileData.display_name || profileData.username}</h1>
              <p className="text-sm text-muted-foreground">@{profileData.username}</p>
            </div>
          </div>
          <FollowButton
            targetUserId={profileData.id}
            isPrivate={profileData.is_private}
            onStatusChange={loadProfile}
          />
        </div>

        {profileData.bio && <p className="text-sm text-foreground/80 mb-5">{profileData.bio}</p>}

        <div className="flex gap-6 mb-6">
          {canView && (
            <div className="text-center">
              <p className="text-lg font-serif text-foreground">{totalPosts}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</p>
            </div>
          )}
          <button onClick={() => navigate(`/user/${profileData.id}/followers`)} className="text-center">
            <p className="text-lg font-serif text-foreground">{followersCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Followers</p>
          </button>
          <button onClick={() => navigate(`/user/${profileData.id}/following`)} className="text-center">
            <p className="text-lg font-serif text-foreground">{followingCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Following</p>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Calendar className="h-3.5 w-3.5" />
          <span>Joined {format(new Date(profileData.created_at), "MMM yyyy")}</span>
        </div>
      </div>

      {canView ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-3">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg text-foreground mb-1">This account is private</h3>
          <p className="text-sm text-muted-foreground text-center">
            Follow this user to see their photos.
          </p>
        </div>
      )}
    </div>
  );
}
