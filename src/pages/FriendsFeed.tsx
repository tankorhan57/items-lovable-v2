import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { isToday, format } from "date-fns";
import type { DirectionKey } from "@/hooks/use-reaction-config";
type ReactionDirection = DirectionKey;
import ReactionDisplay from "@/components/ReactionDisplay";
import NoteComposer from "@/components/NoteComposer";
import CardStack from "@/components/CardStack";
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
  const [reactions, setReactions] = useState<Record<string, ReactionDirection | null>>({});
  const [reactionRefresh, setReactionRefresh] = useState(0);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [todayPrompt, setTodayPrompt] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setShowOverview(false);

    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("status", "accepted");

    const ids = following?.map(f => f.following_id) || [];

    const today = new Date().toISOString().split("T")[0];
    const { data: dailyItem } = await supabase.from("daily_items").select("prompt_text").eq("active_date", today).single();
    setTodayPrompt(dailyItem?.prompt_text || null);

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

  const handleSwipe = useCallback(async (item: FeedPost, direction: DirectionKey) => {
    if (!user || item.user_id === user.id) return;
    const current = reactions[item.id];
    if (current === direction) return;

    setReactions(prev => ({ ...prev, [item.id]: direction }));
    setReactionRefresh(r => r + 1);

    if (!current) {
      await supabase.from("post_reactions").insert({ user_id: user.id, post_id: item.id, reaction_type: direction });
    } else {
      await supabase.from("post_reactions").update({ reaction_type: direction }).eq("post_id", item.id).eq("user_id", user.id);
    }
  }, [user, reactions]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-6">
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 p-2 text-muted-foreground tap-scale transition-ritual">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {todayPrompt && (
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Today's Item</p>
        )}
        {todayPrompt && (
          <p className="text-[20px] italic font-serif text-foreground/70 text-center mb-8 max-w-[260px] leading-relaxed">
            "{todayPrompt}"
          </p>
        )}
        <p className="text-[13px] text-muted-foreground text-center mb-6 max-w-[240px]">
          Your friends haven't posted recently.
        </p>
        <button
          onClick={() => navigate("/search")}
          className="rounded-full border border-border px-5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Find people
        </button>
      </div>
    );
  }

  if (showOverview) {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 z-50 p-2 text-muted-foreground hover:text-foreground transition-ritual tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <FollowingOverview
          users={followedUsers}
          onBackToTop={() => setShowOverview(false)}
          onRefresh={loadFeed}
          todayPrompt={todayPrompt}
          totalPosts={posts.length}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-1 flex items-center justify-between flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-ritual tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Today's Item</p>
        <div className="w-9" />
      </div>

      {/* Card stack */}
      <div className="flex-1 relative">
        <CardStack
          items={posts}
          onSwipe={handleSwipe}
          onEmpty={() => setShowOverview(true)}
          renderCard={(item) => {
            const dateLabel = isToday(new Date(item.confirmed_at))
              ? "Today"
              : format(new Date(item.confirmed_at), "MMM d");

            return (
              <div className="relative w-full h-full">
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4 pb-5">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/user/${item.user_id}`); }}
                    className="tap-scale transition-ritual"
                  >
                    <span className="text-[16px] font-bold text-white drop-shadow-sm">
                      {item.display_name || item.username}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[12px] text-white/70">{dateLabel}</span>
                    {item.city && <span className="text-[12px] text-white/70">· {item.city}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <ReactionDisplay postId={item.id} isOwner={false} refreshKey={reactionRefresh} compact />
                    <button
                      onClick={(e) => { e.stopPropagation(); setNotePostId(item.id); }}
                      className="p-2 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white transition-ritual tap-scale"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
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
