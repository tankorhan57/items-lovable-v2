import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import FollowButton from "@/components/FollowButton";

interface FollowUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export default function FollowList() {
  const { userId, type } = useParams<{ userId: string; type: "followers" | "following" }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = userId === user?.id;
  const isFollowers = type === "followers";

  useEffect(() => {
    if (userId) loadList();
  }, [userId, type]);

  const loadList = async () => {
    if (!userId) return;
    setLoading(true);

    if (isFollowers) {
      // Get accepted followers
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .eq("status", "accepted");

      const ids = data?.map(f => f.follower_id) || [];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_private")
          .in("id", ids);
        setUsers(profiles || []);
      } else {
        setUsers([]);
      }

      // If own profile, also load pending requests
      if (isOwnProfile) {
        const { data: pending } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId)
          .eq("status", "pending");

        const pendingIds = pending?.map(f => f.follower_id) || [];
        if (pendingIds.length > 0) {
          const { data: pendingProfiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, is_private")
            .in("id", pendingIds);
          setPendingRequests(pendingProfiles || []);
        }
      }
    } else {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .eq("status", "accepted");

      const ids = data?.map(f => f.following_id) || [];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_private")
          .in("id", ids);
        setUsers(profiles || []);
      } else {
        setUsers([]);
      }
    }

    setLoading(false);
  };

  const handleAccept = async (followerId: string) => {
    if (!user) return;
    await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", followerId)
      .eq("following_id", user.id);

    // Activity: accepted
    await supabase.from("activity").insert({
      actor_id: user.id,
      user_id: followerId,
      type: "follow_accepted",
    });

    loadList();
  };

  const handleReject = async (followerId: string) => {
    if (!user) return;
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", user.id);

    setPendingRequests(prev => prev.filter(p => p.id !== followerId));
  };

  const UserRow = ({ u }: { u: FollowUser }) => (
    <div className="flex items-center gap-3 py-3">
      <button
        onClick={() => navigate(`/user/${u.id}`)}
        className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0"
      >
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
        )}
      </button>
      <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
        <p className="text-xs text-muted-foreground">@{u.username}</p>
      </button>
      <FollowButton targetUserId={u.id} isPrivate={u.is_private} onStatusChange={loadList} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-serif text-foreground capitalize">{type}</h1>
        </div>
      </div>

      {loading ? (
        <div className="px-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6">
          {pendingRequests.length > 0 && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Follow Requests</p>
              <div className="divide-y divide-border">
                {pendingRequests.map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <button
                      onClick={() => navigate(`/user/${u.id}`)}
                      className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
                      )}
                    </button>
                    <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(u.id)}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(u.id)}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                {isFollowers ? "No followers yet." : "Not following anyone yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => <UserRow key={u.id} u={u} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
