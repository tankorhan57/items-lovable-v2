import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Lock, Search as SearchIcon, Heart, MessageSquare, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import AppreciatorsModal from "@/components/AppreciatorsModal";
import NoteComposer from "@/components/NoteComposer";
import FollowingFeedTab from "@/components/FollowingFeedTab";
import RitualAvatar from "@/components/RitualAvatar";

const PAGE_SIZE = 30;

interface ExplorePost {
  id: string;
  image_url: string;
  city: string | null;
  confirmed_at: string;
  user_id: string;
  user: { username: string; avatar_url: string | null; is_private: boolean };
}

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPosted, setHasPosted] = useState(false);
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<"world" | "following">("following");
  const [appreciatorsPostId, setAppreciatorsPostId] = useState<string | null>(null);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const [noteOwnerId, setNoteOwnerId] = useState("");
  const [todayPrompt, setTodayPrompt] = useState<string | null>(null);

  // Appreciation state per post
  const [appreciated, setAppreciated] = useState<Record<string, boolean>>({});
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  // Follow state per user
  const [followStatus, setFollowStatus] = useState<Record<string, "none" | "requested" | "following">>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  const enrichPosts = async (rawPosts: any[]): Promise<ExplorePost[]> => {
    if (rawPosts.length === 0) return [];
    const userIds = [...new Set(rawPosts.map(p => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, is_private").in("id", userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    return rawPosts.map(p => ({
      id: p.id, image_url: p.image_url, city: p.city, confirmed_at: p.confirmed_at!, user_id: p.user_id,
      user: profileMap.get(p.user_id) || { username: "unknown", avatar_url: null, is_private: false },
    }));
  };

  const loadAppreciations = async (postIds: string[]) => {
    if (!user || postIds.length === 0) return;
    const [{ data: mine }, ...countResults] = await Promise.all([
      supabase.from("appreciations").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ...postIds.map(pid =>
        supabase.from("appreciations").select("*", { count: "exact", head: true }).eq("post_id", pid)
      ),
    ]);
    const mySet = new Set(mine?.map(m => m.post_id) || []);
    const appMap: Record<string, boolean> = {};
    const countMap: Record<string, number> = {};
    postIds.forEach((pid, i) => {
      appMap[pid] = mySet.has(pid);
      countMap[pid] = (countResults[i] as any)?.count || 0;
    });
    setAppreciated(prev => ({ ...prev, ...appMap }));
    setAppCounts(prev => ({ ...prev, ...countMap }));
  };

  const loadFollowStatuses = async (userIds: string[]) => {
    if (!user) return;
    const uniqueIds = [...new Set(userIds.filter(id => id !== user.id))];
    if (uniqueIds.length === 0) return;
    const { data } = await supabase.from("follows").select("following_id, status").eq("follower_id", user.id).in("following_id", uniqueIds);
    const statusMap: Record<string, "none" | "requested" | "following"> = {};
    uniqueIds.forEach(id => { statusMap[id] = "none"; });
    data?.forEach(f => { statusMap[f.following_id] = f.status === "accepted" ? "following" : "requested"; });
    setFollowStatus(prev => ({ ...prev, ...statusMap }));
  };

  const loadInitial = async () => {
    if (!user) return;
    setLoading(true);
    setPosts([]);
    setHasMore(true);

    // Always fetch today's prompt
    const today = new Date().toISOString().split("T")[0];
    const { data: dailyItem } = await supabase.from("daily_items").select("prompt_text").eq("active_date", today).single();
    setTodayPrompt(dailyItem?.prompt_text || null);

    // Check hasPosted for Following tab gating only
    const { data: posted } = await supabase.rpc("has_posted_today", { p_user_id: user.id });
    setHasPosted(!!posted);

    if (tab === "world") {
      const { data: rawPosts } = await supabase.from("posts").select("id, image_url, city, confirmed_at, user_id")
        .not("confirmed_at", "is", null).is("deleted_at", null).order("confirmed_at", { ascending: false }).limit(PAGE_SIZE);
      const enriched = await enrichPosts(rawPosts || []);
      setPosts(enriched);
      setHasMore((rawPosts?.length || 0) >= PAGE_SIZE);
      await Promise.all([
        loadAppreciations(enriched.map(p => p.id)),
        loadFollowStatuses(enriched.map(p => p.user_id)),
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { loadInitial(); }, [user, tab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0 || tab !== "world") return;
    setLoadingMore(true);
    const cursor = posts[posts.length - 1].confirmed_at;
    const { data: rawPosts } = await supabase.from("posts").select("id, image_url, city, confirmed_at, user_id")
      .not("confirmed_at", "is", null).is("deleted_at", null).order("confirmed_at", { ascending: false })
      .lt("confirmed_at", cursor).limit(PAGE_SIZE);
    const enriched = await enrichPosts(rawPosts || []);
    setPosts(prev => [...prev, ...enriched]);
    setHasMore((rawPosts?.length || 0) >= PAGE_SIZE);
    await Promise.all([
      loadAppreciations(enriched.map(p => p.id)),
      loadFollowStatuses(enriched.map(p => p.user_id)),
    ]);
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts, tab]);

  // Scroll-based infinite loading
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || tab !== "world") return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 500;
    if (nearBottom) loadMore();
  }, [loadMore, tab]);

  const toggleAppreciate = async (post: ExplorePost) => {
    if (!user) return;
    const was = appreciated[post.id];
    setAppreciated(prev => ({ ...prev, [post.id]: !was }));
    setAppCounts(prev => ({ ...prev, [post.id]: (prev[post.id] || 0) + (was ? -1 : 1) }));

    if (was) {
      await supabase.from("appreciations").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("appreciations").insert({ user_id: user.id, post_id: post.id });
      if (post.user_id !== user.id) {
        await supabase.from("activity").insert({ actor_id: user.id, user_id: post.user_id, type: "appreciation", reference_id: post.id });
      }
    }
  };

  const toggleFollow = async (post: ExplorePost) => {
    if (!user || post.user_id === user.id) return;
    const current = followStatus[post.user_id] || "none";
    if (current === "following" || current === "requested") {
      setFollowStatus(prev => ({ ...prev, [post.user_id]: "none" }));
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
    } else {
      const newStatus = post.user.is_private ? "pending" : "accepted";
      setFollowStatus(prev => ({ ...prev, [post.user_id]: post.user.is_private ? "requested" : "following" }));
      await supabase.from("follows").insert({ follower_id: user.id, following_id: post.user_id, status: newStatus });
      await supabase.from("activity").insert({ actor_id: user.id, user_id: post.user_id, type: post.user.is_private ? "follow_request" : "follow" });
    }
  };

  if (!hasPosted && !loading && tab === "following") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-5">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-foreground mb-2">Post to explore</h2>
        <p className="text-meta text-center max-w-xs">
          Share your photo for today's Item to unlock how others around the world responded.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "bg-background animate-fade-in",
        tab === "following"
          ? "h-[100dvh] flex flex-col overflow-hidden"
          : "h-[100dvh] overflow-y-auto"
      )}
      style={tab === "world" ? { scrollSnapType: "y mandatory" } : undefined}
    >
      {/* Tab pills — overlaid on first post for World tab */}
      <div
        className={cn(
          "z-40",
          tab === "world"
            ? "fixed top-0 left-0 right-0 pt-14 pb-2 px-5 flex items-center justify-between pointer-events-none"
            : "sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border"
        )}
        data-feed-header
      >
        {tab === "following" && (
          <div className="px-5 pt-14 pb-2 flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-serif font-bold text-foreground">Explore</h1>
              {todayPrompt && (
                <p className="text-[15px] mt-1 italic font-serif text-foreground/60">"{todayPrompt}"</p>
              )}
            </div>
            <button onClick={() => navigate("/search")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-ritual mt-1 tap-scale">
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={cn("flex gap-1.5", tab === "following" ? "px-5 pb-2.5" : "pointer-events-auto")}>
          {(["world", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-5 py-2 text-[13px] font-bold transition-ritual tap-scale",
                tab === t
                  ? tab === "world" ? "bg-white/90 text-black shadow-lg" : "bg-foreground text-background"
                  : tab === "world" ? "bg-black/40 text-white/80 backdrop-blur-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "world" ? "World" : "Following"}
            </button>
          ))}
          {tab === "world" && (
            <div className="flex-1" />
          )}
          {tab === "world" && (
            <button
              onClick={() => navigate("/search")}
              className="pointer-events-auto p-2.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm tap-scale"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {tab === "following" ? (
        <div className="flex-1 min-h-0">
          <FollowingFeedTab />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-[100dvh]">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[100dvh] px-6" style={{ scrollSnapAlign: "start" }}>
          <p className="text-meta text-center">No posts yet today. You're early!</p>
        </div>
      ) : (
        <>
          {/* Prompt card — first "page" */}
          <div
            className="relative flex flex-col items-center justify-center px-8"
            style={{
              height: "calc(100dvh - 65px)",
              scrollSnapAlign: "start",
              background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--secondary)))",
            }}
          >
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-3 mt-16">Today's Item</p>
            <p className="text-[28px] italic font-serif text-foreground/80 text-center max-w-[300px] leading-snug">
              "{todayPrompt}"
            </p>
            <div className="mt-8 flex items-center gap-2 text-muted-foreground">
              <span className="text-[12px]">Swipe to see how others responded</span>
            </div>
            {/* Down arrow hint */}
            <div className="absolute bottom-8 animate-bounce">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Posts */}
          {posts.map((post) => {
            const timeAgo = formatDistanceToNowStrict(new Date(post.confirmed_at), { addSuffix: false });
            const isOwn = post.user_id === user?.id;
            const fStatus = followStatus[post.user_id] || "none";
            const isLiked = appreciated[post.id] || false;
            const likeCount = appCounts[post.id] || 0;

            return (
              <div
                key={post.id}
                className="relative w-full"
                style={{
                  height: "calc(100dvh - 65px)",
                  scrollSnapAlign: "start",
                }}
              >
                {/* Full-bleed image */}
                <img
                  src={post.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Gradient scrim */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Bottom-left: user info */}
                <div className="absolute bottom-5 left-4 right-20 z-10">
                  <button
                    onClick={() => navigate(`/user/${post.user_id}`)}
                    className="flex items-center gap-2.5 tap-scale transition-ritual"
                  >
                    <RitualAvatar
                      src={post.user.avatar_url}
                      fallback={post.user.username[0]?.toUpperCase()}
                      size="sm"
                      className="h-9 w-9 ring-2 ring-white/30"
                    />
                    <div className="text-left">
                      <p className="text-[15px] font-bold text-white drop-shadow-sm">{post.user.username}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-white/60 drop-shadow-sm">{timeAgo} ago</span>
                        {post.city && <span className="text-[12px] text-white/60 drop-shadow-sm">· {post.city}</span>}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Bottom-right: action column */}
                <div className="absolute bottom-5 right-3 z-10 flex flex-col items-center gap-5">
                  {/* Appreciate */}
                  <button
                    onClick={() => toggleAppreciate(post)}
                    className="flex flex-col items-center gap-0.5 tap-scale"
                  >
                    <Heart
                      className={cn(
                        "h-7 w-7 drop-shadow-lg transition-all",
                        isLiked ? "fill-red-500 text-red-500" : "text-white"
                      )}
                    />
                    {likeCount > 0 && (
                      <span className="text-[11px] text-white font-semibold drop-shadow-sm">{likeCount}</span>
                    )}
                  </button>

                  {/* Note */}
                  <button
                    onClick={() => { setNotePostId(post.id); setNoteOwnerId(post.user_id); }}
                    className="flex flex-col items-center gap-0.5 tap-scale"
                  >
                    <MessageSquare className="h-6 w-6 text-white drop-shadow-lg" />
                  </button>

                  {/* Follow */}
                  {!isOwn && (
                    <button
                      onClick={() => toggleFollow(post)}
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full drop-shadow-lg transition-all tap-scale",
                        fStatus === "following"
                          ? "bg-white text-black"
                          : fStatus === "requested"
                            ? "bg-white/30 text-white border border-white/50"
                            : "bg-white/20 text-white border border-white/50"
                      )}
                    >
                      {fStatus === "following" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-8" style={{ scrollSnapAlign: "start" }}>
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </>
      )}

      <AppreciatorsModal postId={appreciatorsPostId} open={!!appreciatorsPostId} onClose={() => setAppreciatorsPostId(null)} />
      <NoteComposer postId={notePostId} postOwnerId={noteOwnerId} open={!!notePostId} onClose={() => setNotePostId(null)} />
    </div>
  );
}
