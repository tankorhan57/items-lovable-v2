import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Flag, Ban } from "lucide-react";

interface ReportBlockMenuProps {
  targetUserId: string;
  targetPostId?: string;
  onBlocked?: () => void;
}

export default function ReportBlockMenu({ targetUserId, targetPostId, onBlocked }: ReportBlockMenuProps) {
  const { user } = useAuth();
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  if (!user || user.id === targetUserId) return null;

  const handleReport = async () => {
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: targetUserId,
      reported_post_id: targetPostId ?? null,
      reason: "inappropriate",
    });
    if (error) {
      toast.error(mapErrorToUserMessage(error));
    } else {
      toast.success("Report submitted. Thank you.");
    }
  };

  const handleBlock = async () => {
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    if (error) {
      if (error.code === "23505") {
        toast("User already blocked");
      } else {
        toast.error(mapErrorToUserMessage(error));
      }
    } else {
      toast.success("User blocked");
      onBlocked?.();
    }
    setShowBlockConfirm(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="More options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleReport} className="text-sm">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBlockConfirm(true)} className="text-sm text-destructive">
            <Ban className="h-4 w-4 mr-2" />
            Block user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your profile or posts, and you won't see theirs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBlock}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
