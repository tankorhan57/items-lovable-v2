import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Lock, MessageSquare, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AppreciateButton from "@/components/AppreciateButton";
import AppreciatorsModal from "@/components/AppreciatorsModal";
import NoteComposer from "@/components/NoteComposer";

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
  const [tab, setTab] = useState<"world" | "following">("world");
  const [appreciatorsPostId, setAppreciatorsPostId] = useState<string | null>(null);
  const [notePostId, setNotePostId] = useState<string | null>(null);
  const [noteOwnerId, setNoteOwnerId] = useState("");

  useEffect(() => {
    checkAndLoad();
  }, [user, tab]);

  const checkAndLoad = async () => {
    if (!user) return;
    setLoading(true);

    const { data: posted } = await supabase.rpc("has_posted_today", { p_user_id: user.id });
    setHasPosted(!!posted);

    if (posted) {
      let query = supabase
        .from("posts")
        .select("id, image_url, city, confirmed_at, user_id")
        .not("confirmed_at", "is", null)
        .order("confirmed_at", { ascending: false })
        .limit(50);

      if (tab === "following") {
        const { data: following } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .eq("status", "accepted");

        const ids = following?.map(f => f.following_id) || [];
        if (ids.length > 0) {
          query = query.in("user_id", ids);
        } else {
          setPosts([]);
          setLoading(false);
          return;
        }
      }

      const { data: rawPosts } = await query;

      if (rawPosts && rawPosts.length > 0) {
        const userIds = [...new Set(rawPosts.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enriched: ExplorePost[] = rawPosts.map(p => ({
          id: p.id,
          image_url: p.image_url,
          city: p.city,
          confirmed_at: p.confirmed_at!,
          user_id: p.user_id,
          user: profileMap.get(p.user_id) || { username: "unknown", avatar_url: null },
        }));
        setPosts(enriched);
      } else {
        setPosts([]);
      }
    }

    setLoading(false);
  };

  if (!hasPosted && !loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">Post to explore</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Share your photo for today's Item to unlock how others around the world responded.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 pt-12 pb-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Explore</h1>
            {posts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {posts.length} {posts.length === 1 ? "person" : "people"} captured today
              </p>
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
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {t === "world" ? "World" : "Following"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-1 p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-sm bg-muted animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          {tab === "following" ? (
            <>
              <h3 className="font-serif text-lg text-foreground mb-1">Your circle is quiet.</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Follow someone to see their moments.
              </p>
              <button
                onClick={() => navigate("/search")}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                Discover people
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              No posts yet today. You're early!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1">
          {posts.map((post) => (
            <div key={post.id} className="group relative aspect-square overflow-hidden rounded-sm cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
              <img
                src={post.image_url}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent p-3">
                <div className="flex items-end justify-between">
                  <button onClick={() => navigate(`/user/${post.user_id}`)} className="text-left">
                    <p className="text-xs font-medium text-background">{post.user.username}</p>
                    {post.city && (
                      <p className="text-[10px] text-background/70">{post.city}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <AppreciateButton
                      postId={post.id}
                      postOwnerId={post.user_id}
                      onShowAppreciators={() => setAppreciatorsPostId(post.id)}
                    />
                    <button
                      onClick={() => {
                        setNotePostId(post.id);
                        setNoteOwnerId(post.user_id);
                      }}
                      className="p-1"
                    >
                      <MessageSquare className="h-4 w-4 text-background/80" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppreciatorsModal
        postId={appreciatorsPostId}
        open={!!appreciatorsPostId}
        onClose={() => setAppreciatorsPostId(null)}
      />

      <NoteComposer
        postId={notePostId}
        postOwnerId={noteOwnerId}
        open={!!notePostId}
        onClose={() => setNotePostId(null)}
      />
    </div>
  );
}
