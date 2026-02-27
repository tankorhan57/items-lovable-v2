import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isToday, format } from "date-fns";
import { MessageSquare } from "lucide-react";
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

export default function FollowingFeedTab() {
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

    const latestByUser = new Map<string, FeedPost>();
    enriched.forEach(p => { if (!latestByUser.has(p.user_id)) latestByUser.set(p.user_id, p); });

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

  // Measure header height to position feed correctly
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector('[data-feed-header]');
    if (header) {
      setHeaderHeight(header.getBoundingClientRect().bottom);
    } else {
      // Fallback: measure the sticky header above us
      const sticky = document.querySelector('.sticky');
      if (sticky) {
        setHeaderHeight(sticky.getBoundingClientRect().bottom);
      }
    }
  }, [loading, showOverview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <h3 className="font-serif text-lg text-foreground mb-1">Your circle is quiet.</h3>
        <p className="text-meta text-center mb-4">Follow someone to see their moments.</p>
        <button onClick={() => navigate("/search")} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
          Discover people
        </button>
      </div>
    );
  }

  if (showOverview) {
    return (
      <FollowingOverview
        users={followedUsers}
        onBackToTop={() => { setShowOverview(false); setCurrentIndex(0); }}
        onRefresh={loadFeed}
      />
    );
  }

  // Bottom nav is ~65px, use fixed positioning to bypass flex chain issues
  const bottomNavHeight = 65;

  return (
    <div
      className="fixed left-0 right-0 bg-background z-30"
      style={{ top: `${headerHeight}px`, bottom: `${bottomNavHeight}px` }}
    >
      <PhotoFeedPager
        items={posts}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        onEndReached={() => {}}
        onHorizontalSwipe={setSwipeState}
        useContainerHeight
        renderItem={(item, _idx, isActive) => {
          const dateLabel = isToday(new Date(item.confirmed_at))
            ? "Today"
            : format(new Date(item.confirmed_at), "MMM d");

          return (
            <HorizontalReaction
              currentReaction={reactions[item.id] || null}
              disabled={item.user_id === user?.id}
              onReact={(dir) => handleReact(item.id, dir)}
              swipeState={isActive ? swipeState : undefined}
            >
              <div className="h-full w-full flex flex-col bg-background">
                {/* Prompt label */}
                <div className="px-4 pt-2 pb-2">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Today's Item</p>
                </div>

                {/* Image — edge-to-edge, grounded */}
                <div className="mx-2 relative flex-shrink-0">
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-full rounded-lg object-cover"
                    style={{
                      height: "60vh",
                      opacity: isActive ? 1 : 0.3,
                      transition: "opacity 300ms ease",
                      boxShadow: "inset 0 8px 12px -4px rgba(0,0,0,0.02), inset 0 -8px 12px -4px rgba(0,0,0,0.02)",
                    }}
                  />
                </div>

                {/* Metadata below photo */}
                <div className="px-4 pt-3 flex items-center justify-between">
                  <div>
                    <button onClick={() => navigate(`/user/${item.user_id}`)} className="tap-scale transition-ritual">
                      <span className="text-[15px] font-bold text-foreground">
                        {item.display_name || item.username}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12px] text-muted-foreground">{dateLabel}</span>
                      {item.city && <span className="text-[12px] text-muted-foreground">· {item.city}</span>}
                    </div>
                    <ReactionDisplay postId={item.id} isOwner={false} refreshKey={reactionRefresh} compact />
                  </div>
                  <button
                    onClick={() => setNotePostId(item.id)}
                    className="p-2.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-ritual tap-scale"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </HorizontalReaction>
          );
        }}
      />

      {/* Progress indicator */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-[3px] pointer-events-none">
        {Array.from({ length: Math.min(7, posts.length) }).map((_, i) => {
          const startIdx = Math.max(0, Math.min(currentIndex - 3, posts.length - 7));
          const idx = startIdx + i;
          if (idx >= posts.length) return null;
          return (
            <div
              key={idx}
              className={`w-[2px] rounded-full transition-all duration-300 ${
                idx === currentIndex ? "h-5 bg-foreground/40" : "h-[5px] bg-foreground/10"
              }`}
            />
          );
        })}
      </div>

      {/* Counter */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground tabular-nums">
          {currentIndex + 1} of {posts.length}
        </span>
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
