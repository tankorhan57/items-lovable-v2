import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { isToday, format } from "date-fns";
import SwipeReaction, { type ReactionDirection } from "@/components/SwipeReaction";
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
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 p-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-serif text-foreground mb-2">No friend posts yet</h2>
        <p className="text-meta text-center">Your friends haven't posted recently.</p>
      </div>
    );
  }

  // Show overview when past the end
  if (showOverview) {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 z-50 p-2 text-muted-foreground hover:text-foreground transition-colors">
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
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-12 pb-3 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 text-white/80 hover:text-white transition-colors pointer-events-auto">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs font-medium text-white/50">
          {currentIndex + 1} / {posts.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Pager */}
      <PhotoFeedPager
        items={posts}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        onEndReached={() => {}}
        renderItem={(item, _idx, isActive) => (
          <SwipeReaction
            currentReaction={reactions[item.id] || null}
            disabled={item.user_id === user?.id}
            onReact={(dir) => handleReact(item.id, dir)}
            longPressMode
          >
            <div className="h-screen w-full flex items-center justify-center bg-black">
              <img
                src={item.image_url}
                alt=""
                className="max-h-full max-w-full object-contain"
                style={{ opacity: isActive ? 1 : 0.6, transition: "opacity 200ms ease" }}
              />
            </div>
          </SwipeReaction>
        )}
        renderOverlay={(item) => (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-10 pt-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
            <div className="flex items-end justify-between">
              <div className="space-y-1 pointer-events-auto">
                <button onClick={() => navigate(`/user/${item.user_id}`)} className="flex items-center gap-2">
                  {item.avatar_url && (
                    <img src={item.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-white/20" />
                  )}
                  <span className="text-sm font-medium text-white/90">
                    {item.display_name || item.username}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50">{dateLabel}</span>
                  {item.city && <span className="text-[11px] text-white/40">· {item.city}</span>}
                </div>
                <ReactionDisplay postId={item.id} isOwner={false} refreshKey={reactionRefresh} compact />
              </div>

              <button
                onClick={() => setNotePostId(item.id)}
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 hover:text-white transition-colors pointer-events-auto"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      />

      {/* Scroll indicators */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pointer-events-none">
        {Array.from({ length: Math.min(7, posts.length) }).map((_, i) => {
          const startIdx = Math.max(0, Math.min(currentIndex - 3, posts.length - 7));
          const idx = startIdx + i;
          if (idx >= posts.length) return null;
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
