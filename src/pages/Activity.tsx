import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, UserPlus, UserCheck, MessageSquare, Bell, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import RitualAvatar from "@/components/RitualAvatar";

const PAGE_SIZE = 20;

interface ActivityItem {
  id: string;
  type: string;
  actor_username: string;
  actor_avatar: string | null;
  actor_id: string;
  reference_id: string | null;
  created_at: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case "appreciation": return Heart;
    case "follow": return UserPlus;
    case "follow_request": return UserPlus;
    case "follow_accepted": return UserCheck;
    case "note": return MessageSquare;
    default: return Bell;
  }
};

const getMessage = (type: string, username: string) => {
  switch (type) {
    case "appreciation": return `${username} appreciated your photo`;
    case "follow": return `${username} started following you`;
    case "follow_request": return `${username} requested to follow you`;
    case "follow_accepted": return `${username} accepted your follow request`;
    case "note": return `${username} sent you a private note`;
    default: return `${username} interacted with you`;
  }
};

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const enrichItems = async (data: any[]): Promise<ActivityItem[]> => {
    if (data.length === 0) return [];
    const actorIds = [...new Set(data.map(a => a.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", actorIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    return data.map(a => ({
      id: a.id,
      type: a.type,
      actor_id: a.actor_id,
      reference_id: a.reference_id,
      actor_username: profileMap.get(a.actor_id)?.username || "someone",
      actor_avatar: profileMap.get(a.actor_id)?.avatar_url || null,
      created_at: a.created_at,
    }));
  };

  const loadInitial = async () => {
    if (!user) return;
    setLoading(true);
    setItems([]);
    setHasMore(true);

    const { data } = await supabase
      .from("activity")
      .select("id, type, actor_id, reference_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const enriched = await enrichItems(data || []);
    setItems(enriched);
    setHasMore((data?.length || 0) >= PAGE_SIZE);

    await supabase
      .from("profiles")
      .update({ last_seen_activity: new Date().toISOString() })
      .eq("id", user.id);

    setLoading(false);
  };

  useEffect(() => { if (user) loadInitial(); }, [user]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || items.length === 0 || !user) return;
    setLoadingMore(true);
    const cursor = items[items.length - 1].created_at;

    const { data } = await supabase
      .from("activity")
      .select("id, type, actor_id, reference_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .lt("created_at", cursor)
      .limit(PAGE_SIZE);

    const enriched = await enrichItems(data || []);
    setItems(prev => [...prev, ...enriched]);
    setHasMore((data?.length || 0) >= PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, items, user]);

  const { containerRef, pullHandlers, PullIndicator } = usePullToRefresh({ onRefresh: loadInitial });
  const { Sentinel } = useInfiniteScroll({ hasMore, loading: loadingMore, onLoadMore: loadMore });

  const handleFollowAction = async (item: ActivityItem, accept: boolean) => {
    try {
      if (accept) {
        await supabase.from("follows").update({ status: "accepted" }).eq("follower_id", item.actor_id).eq("following_id", user!.id);
        await supabase.from("activity").insert({ actor_id: user!.id, user_id: item.actor_id, type: "follow_accepted" });
        toast.success("Follow request accepted");
      } else {
        await supabase.from("follows").delete().eq("follower_id", item.actor_id).eq("following_id", user!.id);
        toast("Follow request declined");
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, type: accept ? "follow_accepted" : "follow_declined" } : i));
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleTap = (item: ActivityItem) => {
    if (item.type === "follow" || item.type === "follow_request" || item.type === "follow_accepted") {
      navigate(`/user/${item.actor_id}`);
    } else if (item.type === "note" && item.reference_id) {
      navigate(`/notes/${item.reference_id}`);
    } else if (item.type === "appreciation" && item.reference_id) {
      navigate(`/post/${item.reference_id}`);
    }
  };

  return (
    <div ref={containerRef} {...pullHandlers} className="min-h-screen bg-background animate-fade-in overflow-y-auto">
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-lg font-serif text-foreground">Activity</h1>
      </div>

      <PullIndicator />

      {loading ? (
        <div className="px-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-3">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg text-foreground mb-1">No interactions yet.</h3>
          <p className="text-meta text-center">
            When someone appreciates or follows you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="px-6 space-y-2">
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <button key={item.id} onClick={() => handleTap(item)} className="flex items-center gap-3 p-4 w-full text-left rounded-xl bg-card border border-border transition-ritual active:scale-[0.98]">
                <RitualAvatar
                  src={item.actor_avatar}
                  fallback={item.actor_username[0]?.toUpperCase()}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{getMessage(item.type, item.actor_username)}</p>
                  <p className="text-meta">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {item.type === "follow_request" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollowAction(item, true); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollowAction(item, false); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
          <Sentinel />
        </div>
      )}
    </div>
  );
}
