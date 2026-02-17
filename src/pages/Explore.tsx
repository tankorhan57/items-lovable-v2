import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplorePost {
  id: string;
  image_url: string;
  city: string | null;
  confirmed_at: string;
  user: { username: string; avatar_url: string | null };
}

export default function Explore() {
  const { user } = useAuth();
  const [hasPosted, setHasPosted] = useState(false);
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"world" | "following">("world");

  useEffect(() => {
    checkAndLoad();
  }, [user, tab]);

  const checkAndLoad = async () => {
    if (!user) return;
    setLoading(true);

    const { data: posted } = await supabase.rpc("has_posted_today", { p_user_id: user.id });
    setHasPosted(!!posted);

    if (posted) {
      const today = new Date().toISOString().split("T")[0];
      
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
        <div className="px-6 pt-12 pb-3">
          <h1 className="text-2xl font-serif text-foreground">Explore</h1>
          {posts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {posts.length} {posts.length === 1 ? "person" : "people"} captured today
            </p>
          )}
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
          <p className="text-sm text-muted-foreground text-center">
            {tab === "following"
              ? "No posts from people you follow yet."
              : "No posts yet today. You're early!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1">
          {posts.map((post) => (
            <div key={post.id} className="group relative aspect-square overflow-hidden rounded-sm">
              <img
                src={post.image_url}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent p-3">
                <p className="text-xs font-medium text-background">{post.user.username}</p>
                {post.city && (
                  <p className="text-[10px] text-background/70">{post.city}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
