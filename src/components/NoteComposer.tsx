import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { triggerPushNotification } from "@/lib/notify";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NoteComposerProps {
  postId: string | null;
  postOwnerId: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function NoteComposer({ postId, postOwnerId, open, onClose, onSent }: NoteComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user || !postId || !content.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from("private_notes").insert({
        author_id: user.id,
        post_id: postId,
        content: content.trim(),
      });

      if (error) throw error;

      // Activity event + push notification
      if (postOwnerId !== user.id) {
        await supabase.from("activity").insert({
          actor_id: user.id,
          user_id: postOwnerId,
          type: "note",
          reference_id: postId,
        });
        triggerPushNotification(
          postOwnerId,
          "note",
          "Private Note",
          "Someone sent you a private note 💬",
          `/notes/${postId}`
        );
      }

      setContent("");
      toast.success("Note sent");
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(mapErrorToUserMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-serif">Private Note</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 140))}
            placeholder="Write a private note..."
            className="w-full h-24 resize-none rounded-lg border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/140</span>
            <Button onClick={handleSend} disabled={sending || !content.trim()} size="sm">
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
