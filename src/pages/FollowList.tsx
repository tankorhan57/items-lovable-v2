import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

const PAGE_SIZE = 20;

interface FollowUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  follow_created_at: string;
}

export default function FollowList() {
  const { userId, type } = useParams<{ userId: string; type: "followers" | "following" }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const isOwnProfile = userId === user?.id;
  const isFollowers = type === "followers";

  const fetchProfiles = async (ids: string[]): Promise<Map<string, any>> => {
    if (ids.length === 0) return new Map();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private")
      .in("id", ids);
    return new Map(profiles?.map(p => [p.id, p]) || []);
  };

  const loadInitial = async () => {
    if (!userId) return;
    setLoading(true);
    setUsers([]);
    setHasMore(true);

    const col = isFollowers ? "following_id" : "follower_id";

    const { data } = await supabase
      .from("follows")
      .select("follower_id, following_id, created_at")
      .eq(col, userId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const ids = data?.map(f => isFollowers ? f.follower_id : f.following_id) || [];
    const profileMap = await fetchProfiles(ids);

    setUsers(
      (data || []).map(f => {
        const id = isFollowers ? f.follower_id : f.following_id;
        const p = profileMap.get(id);
        return {
          id,
          username: p?.username || "unknown",
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          is_private: p?.is_private || false,
          follow_created_at: f.created_at,
        };
      })
    );
    setHasMore((data?.length || 0) >= PAGE_SIZE);

    // Load pending requests for own followers page
    if (isOwnProfile && isFollowers) {
      const { data: pending } = await supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", userId)
        .eq("status", "pending");

      const pendingIds = pending?.map(f => f.follower_id) || [];
      const pendingMap = await fetchProfiles(pendingIds);
      setPendingRequests(
        (pending || []).map(f => {
          const p = pendingMap.get(f.follower_id);
          return {
            id: f.follower_id,
            username: p?.username || "unknown",
            display_name: p?.display_name || null,
            avatar_url: p?.avatar_url || null,
            is_private: p?.is_private || false,
            follow_created_at: f.created_at,
          };
        })
      );
    } else {
      setPendingRequests([]);
    }

    setLoading(false);
  };

  useEffect(() => { if (userId) loadInitial(); }, [userId, type]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || users.length === 0 || !userId) return;
    setLoadingMore(true);
    const cursor = users[users.length - 1].follow_created_at;

    const col = isFollowers ? "following_id" : "follower_id";

    const { data } = await supabase
      .from("follows")
      .select("follower_id, following_id, created_at")
      .eq(col, userId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .lt("created_at", cursor)
      .limit(PAGE_SIZE);

    const ids = data?.map(f => isFollowers ? f.follower_id : f.following_id) || [];
    const profileMap = await fetchProfiles(ids);

    const newUsers = (data || []).map(f => {
      const id = isFollowers ? f.follower_id : f.following_id;
      const p = profileMap.get(id);
      return {
        id,
        username: p?.username || "unknown",
        display_name: p?.display_name || null,
        avatar_url: p?.avatar_url || null,
        is_private: p?.is_private || false,
        follow_created_at: f.created_at,
      };
    });

    setUsers(prev => [...prev, ...newUsers]);
    setHasMore((data?.length || 0) >= PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, users, userId, isFollowers]);

  const { containerRef, pullHandlers, PullIndicator } = usePullToRefresh({ onRefresh: loadInitial });
  const { Sentinel } = useInfiniteScroll({ hasMore, loading: loadingMore, onLoadMore: loadMore });

  const handleAccept = async (followerId: string) => {
    if (!user) return;
    await supabase.from("follows").update({ status: "accepted" }).eq("follower_id", followerId).eq("following_id", user.id);
    await supabase.from("activity").insert({ actor_id: user.id, user_id: followerId, type: "follow_accepted" });
    loadInitial();
  };

  const handleReject = async (followerId: string) => {
    if (!user) return;
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", user.id);
    setPendingRequests(prev => prev.filter(p => p.id !== followerId));
  };

  const UserRow = ({ u }: { u: FollowUser }) => (
    <div className="flex items-center gap-3 py-3">
      <button onClick={() => navigate(`/user/${u.id}`)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
        )}
      </button>
      <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
        <p className="text-xs text-muted-foreground">@{u.username}</p>
      </button>
      <FollowButton targetUserId={u.id} isPrivate={u.is_private} onStatusChange={loadInitial} />
    </div>
  );

  return (
    <div ref={containerRef} {...pullHandlers} className="min-h-screen bg-background animate-fade-in overflow-y-auto">
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-serif text-foreground capitalize">{type}</h1>
          <span className="text-sm text-muted-foreground mt-1">
            {loading ? "…" : isFollowers ? users.length + pendingRequests.length : users.length}
          </span>
        </div>
      </div>

      <PullIndicator />

      {loading ? (
        <div className="px-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6">
          {pendingRequests.length > 0 && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Follow Requests</p>
              <div className="divide-y divide-border">
                {pendingRequests.map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <button onClick={() => navigate(`/user/${u.id}`)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
                      )}
                    </button>
                    <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(u.id)} className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Accept</button>
                      <button onClick={() => handleReject(u.id)} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                {isFollowers ? "No followers yet." : "Not following anyone yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => <UserRow key={u.id} u={u} />)}
            </div>
          )}
          <Sentinel />
        </div>
      )}
    </div>
  );
}
