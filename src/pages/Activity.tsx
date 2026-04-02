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

const ACTIVITY_ACCENT: Record<string, string> = {
  appreciation: "hsl(9 100% 58%)",
  follow: "#4A90D9",
  follow_request: "#4A90D9",
  follow_accepted: "#4A90D9",
  note: "#C4742A",
};

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
  const u = username || "";
  switch (type) {
    case "appreciation": return `${u} appreciated your photo`.trim();
    case "follow": return `${u} started following you`.trim();
    case "follow_request": return `${u} requested to follow you`.trim();
    case "follow_accepted": return `${u} accepted your follow request`.trim();
    case "note": return `${u} sent you a private note`.trim();
    default: return `${u} interacted with you`.trim();
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
      <div className="px-6 pt-safe pb-3">
        <h1 className="font-serif text-[28px] font-bold tracking-[-0.01em] text-foreground">Activity</h1>
      </div>

      <PullIndicator />

      {loading ? (
        <div className="px-6 space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full mb-5" style={{ background: "hsl(9 100% 58% / 0.1)" }}>
            <Bell className="h-8 w-8" style={{ color: "hsl(9 100% 58%)" }} />
          </div>
          <h3 className="font-serif text-xl font-bold text-foreground mb-1">Nothing yet</h3>
          <p className="text-meta text-center max-w-[240px]">
            Appreciations, follows, and notes will show up here
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-1.5 pt-1">
          {items.map((item, idx) => {
            const Icon = getIcon(item.type);
            const accentColor = ACTIVITY_ACCENT[item.type] ?? "hsl(var(--border))";
            return (
              <button
                key={item.id}
                onClick={() => handleTap(item)}
                className="stagger-item flex items-center gap-3 p-3.5 w-full text-left rounded-xl bg-card border border-border shadow-soft tap-scale transition-ritual"
                style={{
                  borderLeft: `3px solid ${accentColor}`,
                  paddingLeft: "12px",
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <RitualAvatar
                  src={item.actor_avatar}
                  fallback={item.actor_username[0]?.toUpperCase()}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-foreground leading-snug">
                    <span className="font-semibold">{item.actor_username}</span>{" "}
                    {getMessage(item.type, "").trim()}
                  </p>
                  <p className="text-meta mt-0.5">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {item.type === "follow_request" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollowAction(item, true); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground tap-scale transition-ritual"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollowAction(item, false); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground border border-border tap-scale transition-ritual"
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
