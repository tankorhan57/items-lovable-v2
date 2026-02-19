import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Lock, Search as SearchIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import AppreciatorsModal from "@/components/AppreciatorsModal";
import NoteComposer from "@/components/NoteComposer";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import FollowingFeedTab from "@/components/FollowingFeedTab";

const PAGE_SIZE = 20;

interface ExplorePost {
  id: string;
  image_url: string;
  city: string | null;
  confirmed_at: string;
  user_id: string;
  user: { username: string; avatar_url: string | null };
}

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPosted, setHasPosted] = useState(false);
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<"world" | "following">("world");
  const [appreciatorsPostId, setAppreciatorsPostId] = useState<string | null>(null);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const [noteOwnerId, setNoteOwnerId] = useState("");
  const [todayPrompt, setTodayPrompt] = useState<string | null>(null);
  const [clusterPosts, setClusterPosts] = useState<ExplorePost[]>([]);

  const enrichPosts = async (rawPosts: any[]): Promise<ExplorePost[]> => {
    if (rawPosts.length === 0) return [];
    const userIds = [...new Set(rawPosts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    return rawPosts.map(p => ({
      id: p.id,
      image_url: p.image_url,
      city: p.city,
      confirmed_at: p.confirmed_at!,
      user_id: p.user_id,
      user: profileMap.get(p.user_id) || { username: "unknown", avatar_url: null },
    }));
  };

  const loadInitial = async () => {
    if (!user) return;
    setLoading(true);
    setPosts([]);
    setHasMore(true);

    const { data: posted } = await supabase.rpc("has_posted_today", { p_user_id: user.id });
    setHasPosted(!!posted);
    if (!posted) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];
    const { data: dailyItem } = await supabase
      .from("daily_items")
      .select("prompt_text")
      .eq("active_date", today)
      .single();
    setTodayPrompt(dailyItem?.prompt_text || null);

    if (tab === "world") {
      const query = supabase
        .from("posts")
        .select("id, image_url, city, confirmed_at, user_id")
        .not("confirmed_at", "is", null)
        .is("deleted_at", null)
        .order("confirmed_at", { ascending: false })
        .limit(PAGE_SIZE);

      const { data: rawPosts } = await query;
      const enriched = await enrichPosts(rawPosts || []);
      setPosts(enriched);
      setHasMore((rawPosts?.length || 0) >= PAGE_SIZE);

      if (enriched.length >= 2) {
        const seenCities = new Set<string>();
        const cluster: ExplorePost[] = [];
        for (const p of enriched) {
          const city = p.city || "Unknown";
          if (!seenCities.has(city) && cluster.length < 5) {
            seenCities.add(city);
            cluster.push(p);
          }
        }
        setClusterPosts(cluster.length >= 2 ? cluster : []);
      } else {
        setClusterPosts([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => { loadInitial(); }, [user, tab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0 || tab !== "world") return;
    setLoadingMore(true);
    const cursor = posts[posts.length - 1].confirmed_at;

    const query = supabase
      .from("posts")
      .select("id, image_url, city, confirmed_at, user_id")
      .not("confirmed_at", "is", null)
      .is("deleted_at", null)
      .order("confirmed_at", { ascending: false })
      .lt("confirmed_at", cursor)
      .limit(PAGE_SIZE);

    const { data: rawPosts } = await query;
    const enriched = await enrichPosts(rawPosts || []);

    setPosts(prev => [...prev, ...enriched]);
    setHasMore((rawPosts?.length || 0) >= PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts, tab]);

  const { containerRef, pullHandlers, PullIndicator } = usePullToRefresh({
    onRefresh: loadInitial,
  });

  const { Sentinel } = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  if (!hasPosted && !loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">Post to explore</h2>
        <p className="text-meta text-center max-w-xs">
          Share your photo for today's Item to unlock how others around the world responded.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      {...(tab === "world" ? pullHandlers : {})}
      className={cn(
        "bg-background animate-fade-in",
        tab === "following" ? "h-[100dvh] flex flex-col overflow-hidden" : "min-h-screen overflow-y-auto"
      )}
    >
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 pt-12 pb-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Explore</h1>
            {todayPrompt && (
              <p className="text-meta mt-1 italic font-serif">"{todayPrompt}"</p>
            )}
          </div>
          <button onClick={() => navigate("/search")} className="p-2 text-muted-foreground hover:text-foreground transition-colors mt-1">
            <SearchIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 px-6 pb-3">
          {(["world", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                tab === t
                  ? "bg-foreground/10 text-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "world" ? "World" : "Following"}
            </button>
          ))}
        </div>
      </div>

      {tab === "world" && <PullIndicator />}

      {tab === "following" ? (
        <div className="flex-1 min-h-0">
          <FollowingFeedTab />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="text-meta text-center">No posts yet today. You're early!</p>
        </div>
      ) : (
        <div>
          {clusterPosts.length >= 2 && (
            <div className="px-4 py-8 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-serif text-foreground">Today Around the World</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {clusterPosts.map((cp) => (
                  <div key={cp.id} className="shrink-0 w-28 cursor-pointer" onClick={() => navigate(`/post/${cp.id}`)}>
                    <div className="aspect-square overflow-hidden rounded-lg">
                      <img src={cp.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">{cp.city || "Somewhere"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const getTimeOfDay = (ts: string) => {
              const h = new Date(ts).getUTCHours();
              if (h < 12) return "Morning";
              if (h < 17) return "Afternoon";
              return "Evening";
            };
            let lastTod = "";
            const elements: React.ReactNode[] = [];
            let gridBatch: ExplorePost[] = [];

            const flushGrid = () => {
              if (gridBatch.length === 0) return;
              const batch = [...gridBatch];
              elements.push(
                <div key={`grid-${batch[0].id}`} className="grid grid-cols-2 gap-2 px-2">
                  {batch.map((post) => (
                    <div key={post.id} className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer active:scale-[0.98] transition-ritual" onClick={() => navigate(`/post/${post.id}`)}>
                      <img src={post.image_url} alt="" className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/40 to-transparent p-3">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${post.user_id}`); }} className="text-left">
                          <p className="text-xs font-medium text-background">{post.user.username}</p>
                          {post.city && <p className="text-[10px] text-background/60">{post.city}</p>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
              gridBatch = [];
            };

            posts.forEach((post) => {
              const tod = getTimeOfDay(post.confirmed_at);
              if (tod !== lastTod) {
                flushGrid();
                elements.push(
                  <p key={`tod-${tod}-${post.id}`} className="text-meta px-4 py-3">{tod}</p>
                );
                lastTod = tod;
              }
              gridBatch.push(post);
            });
            flushGrid();

            return <div className="pb-2">{elements}</div>;
          })()}
          <Sentinel />
        </div>
      )}

      <AppreciatorsModal postId={appreciatorsPostId} open={!!appreciatorsPostId} onClose={() => setAppreciatorsPostId(null)} />
      <NoteComposer postId={notePostId} postOwnerId={noteOwnerId} open={!!notePostId} onClose={() => setNotePostId(null)} />
    </div>
  );
}
