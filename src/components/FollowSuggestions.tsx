import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import RitualAvatar from "@/components/RitualAvatar";
import { Check } from "lucide-react";

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FollowSuggestionsProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function FollowSuggestions({ onComplete, onSkip }: FollowSuggestionsProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    if (!user) return;
    
    // Get active public users who have posted recently
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .neq("id", user.id)
      .eq("is_private", false)
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .limit(6);

    setUsers(data || []);
    setLoading(false);
  };

  const toggleUser = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const handleFollow = async () => {
    if (!user || selected.size === 0) {
      onComplete();
      return;
    }
    setFollowing(true);

    const follows = Array.from(selected).map(id => ({
      follower_id: user.id,
      following_id: id,
      status: "accepted",
    }));

    await supabase.from("follows").insert(follows);
    
    // Create activity entries
    const activities = Array.from(selected).map(id => ({
      actor_id: user.id,
      user_id: id,
      type: "follow",
      reference_id: null,
    }));
    await supabase.from("activity").insert(activities);

    onComplete();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    onSkip();
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-foreground mb-3">Find your people</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Follow some users to see their daily photos in your feed.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all tap-scale ${
                selected.has(u.id) ? "bg-primary/10 border border-primary/30" : "bg-card border border-border"
              }`}
            >
              <RitualAvatar
                src={u.avatar_url}
                fallback={u.username[0]?.toUpperCase()}
                size="sm"
              />
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.display_name || u.username}
                </p>
                <p className="text-meta truncate">@{u.username}</p>
              </div>
              {selected.has(u.id) && (
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {users.length > 1 && (
          <button
            onClick={selectAll}
            className="text-sm text-primary hover:text-primary/80 transition-colors mb-6 block mx-auto"
          >
            {selected.size === users.length ? "Deselect all" : "Follow all"}
          </button>
        )}

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 h-10 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleFollow}
            disabled={following}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {following ? "Following..." : selected.size > 0 ? `Follow ${selected.size}` : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
