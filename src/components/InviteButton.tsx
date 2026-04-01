import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { shareContent } from "@/lib/share-utils";
import { toast } from "sonner";

export default function InviteButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Generate a short invite code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase.from("invites").insert({
        invite_code: code,
        inviter_id: user.id,
      });

      if (error) {
        // If unique violation, retry once
        if (error.code === "23505") {
          const retry = Math.random().toString(36).substring(2, 8).toUpperCase();
          await supabase.from("invites").insert({
            invite_code: retry,
            inviter_id: user.id,
          });
          await shareInvite(retry);
        } else {
          throw error;
        }
      } else {
        await shareInvite(code);
      }
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setLoading(false);
    }
  };

  const shareInvite = async (code: string) => {
    const baseUrl = window.location.origin;
    await shareContent({
      title: "Join me on Items",
      text: "I'm using Items — a daily photo sharing app. Join me!",
      url: `${baseUrl}/auth?invite=${code}`,
    });
  };

  return (
    <button
      onClick={handleInvite}
      disabled={loading}
      className={className || "flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors py-3 border-t border-border w-full"}
    >
      <UserPlus className="h-4 w-4" />
      {loading ? "Creating invite..." : "Invite friends"}
    </button>
  );
}
