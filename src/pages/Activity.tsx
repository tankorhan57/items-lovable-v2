import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, UserPlus, UserCheck, MessageSquare, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  actor_username: string;
  actor_avatar: string | null;
  actor_id: string;
  reference_id: string | null;
  created_at: string;
}

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadActivity();
  }, [user]);

  const loadActivity = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("activity")
      .select("id, type, actor_id, reference_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const actorIds = [...new Set(data.map(a => a.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", actorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setItems(data.map(a => ({
        id: a.id,
        type: a.type,
        actor_id: a.actor_id,
        reference_id: a.reference_id,
        actor_username: profileMap.get(a.actor_id)?.username || "someone",
        actor_avatar: profileMap.get(a.actor_id)?.avatar_url || null,
        created_at: a.created_at,
      })));
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "appreciation": return Heart;
      case "follow": return UserPlus;
      case "follow_request": return UserPlus;
      case "follow_accepted": return UserCheck;
      case "note": return MessageSquare;
      default: return Bell;
    }
  };

  const getMessage = (type: string, username: string) => {
    switch (type) {
      case "appreciation": return `${username} appreciated your photo`;
      case "follow": return `${username} started following you`;
      case "follow_request": return `${username} requested to follow you`;
      case "follow_accepted": return `${username} accepted your follow request`;
      case "note": return `${username} sent you a private note`;
      default: return `${username} interacted with you`;
    }
  };

  const handleTap = (item: ActivityItem) => {
    if (item.type === "follow" || item.type === "follow_request" || item.type === "follow_accepted") {
      navigate(`/user/${item.actor_id}`);
    } else if (item.type === "note" && item.reference_id) {
      navigate(`/notes/${item.reference_id}`);
    } else if (item.type === "appreciation" && item.reference_id) {
      // Could navigate to post detail, for now go to profile
      navigate(`/user/${item.actor_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-2xl font-serif text-foreground">Activity</h1>
      </div>

      {loading ? (
        <div className="px-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-3">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg text-foreground mb-1">No activity yet</h3>
          <p className="text-sm text-muted-foreground text-center">
            When people appreciate your photos or follow you, it'll show up here.
          </p>
        </div>
      ) : (
        <div className="px-6 divide-y divide-border">
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <button
                key={item.id}
                onClick={() => handleTap(item)}
                className="flex items-center gap-3 py-3.5 w-full text-left"
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {item.actor_avatar ? (
                    <img src={item.actor_avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{getMessage(item.type, item.actor_username)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
