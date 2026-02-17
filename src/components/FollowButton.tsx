import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  isPrivate: boolean;
  size?: "sm" | "default";
  onStatusChange?: () => void;
}

type FollowStatus = "none" | "requested" | "following";

export default function FollowButton({ targetUserId, isPrivate, size = "sm", onStatusChange }: FollowButtonProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus>("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    checkStatus();
  }, [user, targetUserId]);

  const checkStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (data) {
      setStatus(data.status === "accepted" ? "following" : "requested");
    } else {
      setStatus("none");
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const newStatus = isPrivate ? "pending" : "accepted";
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
        status: newStatus,
      });

      if (error) throw error;

      // Create activity event
      await supabase.from("activity").insert({
        actor_id: user.id,
        user_id: targetUserId,
        type: isPrivate ? "follow_request" : "follow",
        reference_id: null,
      });

      setStatus(isPrivate ? "requested" : "following");
      onStatusChange?.();
    } catch {
      // Might be duplicate
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!user) return;
    setLoading(true);

    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    setStatus("none");
    onStatusChange?.();
    setLoading(false);
  };

  if (!user || user.id === targetUserId) return null;

  if (status === "following") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleUnfollow}
        disabled={loading}
        className="text-xs"
      >
        Following
      </Button>
    );
  }

  if (status === "requested") {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className="text-xs opacity-70"
      >
        Requested
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={handleFollow}
      disabled={loading}
      className="text-xs"
    >
      {isPrivate ? "Request" : "Follow"}
    </Button>
  );
}
