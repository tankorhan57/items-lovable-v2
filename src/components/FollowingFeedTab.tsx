import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isToday, format } from "date-fns";
import { MessageSquare, Search as SearchIcon } from "lucide-react";
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

  const post = posts[currentIndex];
  const dateLabel = post && isToday(new Date(post.confirmed_at)) ? "Today" : post ? format(new Date(post.confirmed_at), "MMM d") : "";

  return (
    <div className="relative bg-black" style={{ height: "calc(100vh - 145px)" }}>
      {/* Pager */}
      <PhotoFeedPager
        items={posts}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        onEndReached={() => {}}
        useContainerHeight
        renderItem={(item, _idx, isActive) => (
          <SwipeReaction
            currentReaction={reactions[item.id] || null}
            disabled={item.user_id === user?.id}
            onReact={(dir) => handleReact(item.id, dir)}
            longPressMode
          >
            <div className="h-full w-full flex items-center justify-center bg-black" style={{ height: "calc(100vh - 145px)" }}>
              <img
                src={item.image_url}
                alt=""
                className="max-h-full max-w-full object-contain"
                style={{ opacity: isActive ? 1 : 0.5, transition: "opacity 180ms ease" }}
              />
            </div>
          </SwipeReaction>
        )}
        renderOverlay={(item) => (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
            <div className="flex items-end justify-between">
              <div className="space-y-0.5 pointer-events-auto">
                <button onClick={() => navigate(`/user/${item.user_id}`)} className="flex items-center gap-2">
                  {item.avatar_url && (
                    <img src={item.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover border border-white/20" />
                  )}
                  <span className="text-sm font-medium text-white/90">{item.display_name || item.username}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50">{dateLabel}</span>
                  {item.city && <span className="text-[11px] text-white/40">· {item.city}</span>}
                </div>
                <ReactionDisplay postId={item.id} isOwner={false} refreshKey={reactionRefresh} compact />
              </div>
              <button
                onClick={() => setNotePostId(item.id)}
                className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors pointer-events-auto"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      />

      {/* Progress dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pointer-events-none">
        {Array.from({ length: Math.min(7, posts.length) }).map((_, i) => {
          const startIdx = Math.max(0, Math.min(currentIndex - 3, posts.length - 7));
          const idx = startIdx + i;
          if (idx >= posts.length) return null;
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-200 ${
                idx === currentIndex ? "h-3.5 bg-white/60" : "h-1.5 bg-white/20"
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
