import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { format, isToday } from "date-fns";
import SwipeReaction, { type ReactionDirection } from "@/components/SwipeReaction";
import ReactionDisplay from "@/components/ReactionDisplay";
import NoteComposer from "@/components/NoteComposer";

interface FeedPost {
  id: string;
  image_url: string;
  city: string | null;
  confirmed_at: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

const PREFETCH_COUNT = 3;

export default function FriendsFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionDirection | null>>({});
  const [reactionRefresh, setReactionRefresh] = useState(0);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const isAnimatingRef = useRef(false);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (user) loadFeed();
  }, [user]);

  const loadFeed = async () => {
    if (!user) return;

    // Get following IDs
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("status", "accepted");

    const ids = following?.map(f => f.following_id) || [];
    if (ids.length === 0) { setLoading(false); return; }

    // Load posts from last 7 days, today first
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("id, image_url, city, confirmed_at, user_id")
      .in("user_id", ids)
      .not("confirmed_at", "is", null)
      .is("deleted_at", null)
      .gte("confirmed_at", sevenDaysAgo.toISOString())
      .order("confirmed_at", { ascending: false })
      .limit(50);

    if (!rawPosts || rawPosts.length === 0) { setLoading(false); return; }

    // Enrich with profiles
    const userIds = [...new Set(rawPosts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enriched: FeedPost[] = rawPosts.map(p => {
      const prof = profileMap.get(p.user_id);
      return {
        ...p,
        confirmed_at: p.confirmed_at!,
        username: prof?.username || "unknown",
        display_name: prof?.display_name || null,
        avatar_url: prof?.avatar_url || null,
      };
    });

    setPosts(enriched);

    // Load user's reactions for these posts
    const { data: myReactions } = await supabase
      .from("post_reactions")
      .select("post_id, reaction_type")
      .eq("user_id", user.id)
      .in("post_id", enriched.map(p => p.id));

    const reactionMap: Record<string, ReactionDirection> = {};
    myReactions?.forEach(r => {
      reactionMap[r.post_id] = r.reaction_type as ReactionDirection;
    });
    setReactions(reactionMap);
    setLoading(false);
  };

  // Prefetch images
  useEffect(() => {
    for (let i = currentIndex + 1; i < Math.min(currentIndex + PREFETCH_COUNT, posts.length); i++) {
      const img = new Image();
      img.src = posts[i].image_url;
    }
  }, [currentIndex, posts]);

  // Vertical navigation with snap
  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= posts.length || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setCurrentIndex(index);
    setTranslateY(0);
    setTimeout(() => { isAnimatingRef.current = false; }, 300);
  }, [posts.length]);

  const handleNavTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
    setIsDragging(true);
  }, []);

  const handleNavTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Only allow vertical drag for navigation
    setTranslateY(dy * 0.4); // damped
  }, [isDragging]);

  const handleNavTouchEnd = useCallback(() => {
    setIsDragging(false);
    const velocity = translateY / (Date.now() - touchStartRef.current.time + 1);
    if (translateY < -40 || velocity < -0.3) {
      goTo(currentIndex + 1);
    } else if (translateY > 40 || velocity > 0.3) {
      goTo(currentIndex - 1);
    } else {
      setTranslateY(0);
    }
  }, [translateY, currentIndex, goTo]);

  const handleReact = useCallback(async (postId: string, postOwnerId: string, direction: ReactionDirection) => {
    if (!user) return;
    const currentReaction = reactions[postId];

    if (currentReaction === direction) {
      // Remove
      setReactions(prev => ({ ...prev, [postId]: null }));
      setReactionRefresh(r => r + 1);
      await supabase.from("post_reactions").delete()
        .eq("post_id", postId).eq("user_id", user.id);
      return;
    }

    const isNew = !currentReaction;
    setReactions(prev => ({ ...prev, [postId]: direction }));
    setReactionRefresh(r => r + 1);

    if (isNew) {
      await supabase.from("post_reactions").insert({
        user_id: user.id, post_id: postId, reaction_type: direction,
      });
    } else {
      await supabase.from("post_reactions").update({ reaction_type: direction })
        .eq("post_id", postId).eq("user_id", user.id);
    }
  }, [user, reactions]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-6">
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 p-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-serif text-foreground mb-2">No friend posts yet</h2>
        <p className="text-meta text-center">Your friends haven't posted recently.</p>
      </div>
    );
  }

  const post = posts[currentIndex];
  const dateLabel = isToday(new Date(post.confirmed_at)) ? "Today" : format(new Date(post.confirmed_at), "MMM d");

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-12 pb-3 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => navigate(-1)} className="p-2 text-white/80 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs font-medium text-white/60">
          {currentIndex + 1} / {posts.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Post pager */}
      <div
        className="absolute inset-0"
        onTouchStart={handleNavTouchStart}
        onTouchMove={handleNavTouchMove}
        onTouchEnd={handleNavTouchEnd}
      >
        <div
          style={{
            transform: `translateY(${translateY}px)`,
            transition: isDragging ? "none" : "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
          className="h-full w-full"
        >
          <SwipeReaction
            currentReaction={reactions[post.id] || null}
            disabled={post.user_id === user?.id}
            onReact={(dir) => handleReact(post.id, post.user_id, dir)}
            longPressMode
          >
            <div className="h-screen w-full flex items-center justify-center">
              <img
                src={post.image_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </SwipeReaction>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-10 pt-16 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {post.avatar_url && (
                <img src={post.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-white/20" />
              )}
              <span className="text-sm font-medium text-white/90">
                {post.display_name || post.username}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50">{dateLabel}</span>
              {post.city && <span className="text-[11px] text-white/40">· {post.city}</span>}
            </div>
            <ReactionDisplay postId={post.id} isOwner={false} refreshKey={reactionRefresh} compact />
          </div>

          <button
            onClick={() => setNotePostId(post.id)}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scroll indicators */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1">
        {posts.slice(Math.max(0, currentIndex - 3), Math.min(posts.length, currentIndex + 4)).map((_, i) => {
          const idx = Math.max(0, currentIndex - 3) + i;
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-200 ${
                idx === currentIndex ? "h-4 bg-white/70" : "h-1.5 bg-white/20"
              }`}
            />
          );
        })}
      </div>

      <NoteComposer
        postId={notePostId}
        postOwnerId={notePostId ? posts.find(p => p.id === notePostId)?.user_id || "" : ""}
        open={!!notePostId}
        onClose={() => setNotePostId(null)}
      />
    </div>
  );
}
