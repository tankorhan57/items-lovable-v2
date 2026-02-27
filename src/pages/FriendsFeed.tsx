import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { isToday, format } from "date-fns";
import HorizontalReaction from "@/components/HorizontalReaction";
import type { DirectionKey } from "@/hooks/use-reaction-config";
import type { HorizontalSwipeState } from "@/components/PhotoFeedPager";
type ReactionDirection = DirectionKey;
import ReactionDisplay from "@/components/ReactionDisplay";
import NoteComposer from "@/components/NoteComposer";
import PhotoFeedPager from "@/components/PhotoFeedPager";
import FollowingOverview from "@/components/FollowingOverview";

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

interface FollowedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  latestPost?: { id: string; image_url: string; confirmed_at: string } | null;
}

export default function FriendsFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionDirection | null>>({});
  const [reactionRefresh, setReactionRefresh] = useState(0);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [swipeState, setSwipeState] = useState<HorizontalSwipeState>({ dx: 0, phase: "idle", velocity: 0 });

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setShowOverview(false);
    setCurrentIndex(0);

    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("status", "accepted");

    const ids = following?.map(f => f.following_id) || [];
    if (ids.length === 0) { setLoading(false); return; }

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("id, image_url, city, confirmed_at, user_id")
      .in("user_id", ids)
      .not("confirmed_at", "is", null)
      .is("deleted_at", null)
      .gte("confirmed_at", tenDaysAgo.toISOString())
      .order("confirmed_at", { ascending: false })
      .limit(100);

    // Enrich with profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enriched: FeedPost[] = (rawPosts || []).map(p => {
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

    // Build followed users list for overview
    const latestByUser = new Map<string, FeedPost>();
    enriched.forEach(p => {
      if (!latestByUser.has(p.user_id)) latestByUser.set(p.user_id, p);
    });

    const users: FollowedUser[] = ids.map(id => {
      const prof = profileMap.get(id);
      const latest = latestByUser.get(id);
      return {
        id,
        username: prof?.username || "unknown",
        display_name: prof?.display_name || null,
        avatar_url: prof?.avatar_url || null,
        latestPost: latest ? { id: latest.id, image_url: latest.image_url, confirmed_at: latest.confirmed_at } : null,
      };
    });
    setFollowedUsers(users);

    // Load reactions
    if (enriched.length > 0) {
      const { data: myReactions } = await supabase
        .from("post_reactions")
        .select("post_id, reaction_type")
        .eq("user_id", user.id)
        .in("post_id", enriched.map(p => p.id));

      const reactionMap: Record<string, ReactionDirection> = {};
      myReactions?.forEach(r => { reactionMap[r.post_id] = r.reaction_type as ReactionDirection; });
      setReactions(reactionMap);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleReact = useCallback(async (postId: string, direction: ReactionDirection) => {
    if (!user) return;
    const current = reactions[postId];

    if (current === direction) {
      setReactions(prev => ({ ...prev, [postId]: null }));
      setReactionRefresh(r => r + 1);
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
      return;
    }

    const isNew = !current;
    setReactions(prev => ({ ...prev, [postId]: direction }));
    setReactionRefresh(r => r + 1);

    if (isNew) {
      await supabase.from("post_reactions").insert({ user_id: user.id, post_id: postId, reaction_type: direction });
    } else {
      await supabase.from("post_reactions").update({ reaction_type: direction }).eq("post_id", postId).eq("user_id", user.id);
    }
  }, [user, reactions]);

  const handleIndexChange = useCallback((index: number) => {
    if (index >= posts.length) {
      setShowOverview(true);
    } else {
      setShowOverview(false);
      setCurrentIndex(index);
    }
  }, [posts.length]);

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
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 p-2 text-muted-foreground tap-scale transition-ritual">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-serif text-foreground mb-2">No friend posts yet</h2>
        <p className="text-meta text-center max-w-xs">Your friends haven't posted recently.</p>
      </div>
    );
  }

  // Show overview when past the end
  if (showOverview) {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 z-50 p-2 text-muted-foreground hover:text-foreground transition-ritual tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <FollowingOverview
          users={followedUsers}
          onBackToTop={() => { setShowOverview(false); setCurrentIndex(0); }}
          onRefresh={loadFeed}
        />
      </div>
    );
  }

  const post = posts[currentIndex];
  const dateLabel = post && isToday(new Date(post.confirmed_at)) ? "Today" : post ? format(new Date(post.confirmed_at), "MMM d") : "";

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Editorial header — clean, minimal */}
      <div className="absolute top-0 left-0 right-0 z-30 px-5 pt-12 pb-4 flex items-center justify-between bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/80 hover:text-white transition-ritual tap-scale pointer-events-auto">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[11px] font-medium tracking-wider uppercase text-white/35 tabular-nums">
          {currentIndex + 1} of {posts.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Pager */}
      <PhotoFeedPager
        items={posts}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        onEndReached={() => {}}
        onHorizontalSwipe={setSwipeState}
        renderItem={(item, _idx, isActive) => (
          <HorizontalReaction
            currentReaction={reactions[item.id] || null}
            disabled={item.user_id === user?.id}
            onReact={(dir) => handleReact(item.id, dir)}
            swipeState={isActive ? swipeState : undefined}
          >
            <div className="h-full w-full flex items-center justify-center bg-black">
              <img
                src={item.image_url}
                alt=""
                className="h-full w-full object-cover"
                style={{ opacity: isActive ? 1 : 0.3, transition: "opacity 300ms ease" }}
              />
            </div>
          </HorizontalReaction>
        )}
        renderOverlay={(item) => (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8 pt-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none">
            <div className="flex items-end justify-between">
              <div className="pointer-events-auto">
                <button onClick={() => navigate(`/user/${item.user_id}`)} className="flex items-center gap-2.5 tap-scale transition-ritual mb-1.5">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/15" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white/80">
                      {(item.display_name || item.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[14px] font-bold text-white/95 tracking-[-0.01em]">
                    {item.display_name || item.username}
                  </span>
                </button>
                <div className="flex items-center gap-2 pl-[42px] mb-1">
                  <span className="text-[11px] text-white/40">{dateLabel}</span>
                  {item.city && <span className="text-[11px] text-white/30">· {item.city}</span>}
                </div>
                <div className="pl-[42px]">
                  <ReactionDisplay postId={item.id} isOwner={false} refreshKey={reactionRefresh} compact />
                </div>
              </div>

              <button
                onClick={() => setNotePostId(item.id)}
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/60 hover:text-white hover:bg-white/20 transition-ritual tap-scale pointer-events-auto"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      />

      {/* Scroll indicator — editorial thin line */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-[3px] pointer-events-none">
        {Array.from({ length: Math.min(7, posts.length) }).map((_, i) => {
          const startIdx = Math.max(0, Math.min(currentIndex - 3, posts.length - 7));
          const idx = startIdx + i;
          if (idx >= posts.length) return null;
          return (
            <div
              key={idx}
              className={`w-[2px] rounded-full transition-all duration-300 ${
                idx === currentIndex ? "h-5 bg-white/60" : "h-1.5 bg-white/15"
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
