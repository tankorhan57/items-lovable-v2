import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerPushNotification } from "@/lib/notify";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { toast } from "sonner";

interface AppreciateButtonProps {
  postId: string;
  postOwnerId: string;
  onCountChange?: (count: number) => void;
  onShowAppreciators?: () => void;
}

export default function AppreciateButton({ postId, postOwnerId, onCountChange, onShowAppreciators }: AppreciateButtonProps) {
  const { user } = useAuth();
  const [appreciated, setAppreciated] = useState(false);
  const [count, setCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadState();
  }, [user, postId]);

  const loadState = async () => {
    if (!user) return;

    const [{ data: mine }, { count: total }] = await Promise.all([
      supabase
        .from("appreciations")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("appreciations")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId),
    ]);

    setAppreciated(!!mine);
    setCount(total || 0);
    onCountChange?.(total || 0);
  };

  const toggle = async () => {
    if (!user) return;

    if (appreciated) {
      setAppreciated(false);
      setCount(c => c - 1);
      onCountChange?.(count - 1);

      const { error } = await supabase
        .from("appreciations")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) {
        setAppreciated(true);
        setCount(c => c + 1);
        onCountChange?.(count);
        toast.error(mapErrorToUserMessage(error));
        return;
      }
    } else {
      setAppreciated(true);
      setCount(c => c + 1);
      onCountChange?.(count + 1);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);

      const { error } = await supabase.from("appreciations").insert({
        user_id: user.id,
        post_id: postId,
      });
      if (error) {
        setAppreciated(false);
        setCount(c => c - 1);
        onCountChange?.(count);
        toast.error(mapErrorToUserMessage(error));
        return;
      }

      if (postOwnerId !== user.id) {
        await supabase.from("activity").insert({
          actor_id: user.id,
          user_id: postOwnerId,
          type: "appreciation",
          reference_id: postId,
        });
        triggerPushNotification(
          postOwnerId,
          "appreciation",
          "New Appreciation",
          "Someone appreciated your photo ❤️",
          `/post/${postId}`
        );
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggle} className="p-1">
        <Heart
          className={cn(
            "h-5 w-5 transition-all",
            appreciated ? "fill-foreground/60 text-foreground/60" : "text-muted-foreground",
            animating && "scale-125"
          )}
        />
      </button>
      {count > 0 && (
        <button
          onClick={onShowAppreciators}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {count}
        </button>
      )}
    </div>
  );
}
