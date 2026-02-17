import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppreciatorsModalProps {
  postId: string | null;
  open: boolean;
  onClose: () => void;
}

interface Appreciator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function AppreciatorsModal({ postId, open, onClose }: AppreciatorsModalProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Appreciator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && postId) loadAppreciators();
  }, [open, postId]);

  const loadAppreciators = async () => {
    if (!postId) return;
    setLoading(true);

    const { data } = await supabase
      .from("appreciations")
      .select("user_id")
      .eq("post_id", postId);

    const ids = data?.map(a => a.user_id) || [];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setUsers(profiles || []);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Appreciated by</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No appreciations yet.</p>
        ) : (
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { onClose(); navigate(`/user/${u.id}`); }}
                className="flex items-center gap-3 py-2.5 w-full text-left hover:bg-secondary/50 rounded-md px-2 -mx-2 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
