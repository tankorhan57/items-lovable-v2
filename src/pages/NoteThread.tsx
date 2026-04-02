import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mapErrorToUserMessage } from "@/lib/error-utils";

interface Note {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
}

export default function NoteThread() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOwner, setPostOwner] = useState<string | null>(null);

  useEffect(() => {
    if (postId && user) loadThread();
  }, [postId, user]);

  const loadThread = async () => {
    if (!postId || !user) return;
    setLoading(true);

    // Get the post owner
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (post) setPostOwner(post.user_id);

    // Get notes for this post that the current user can see
    const { data } = await supabase
      .from("private_notes")
      .select("id, content, author_id, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setNotes(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-safe-sm pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-serif text-foreground">Notes</h1>
        </div>
      </div>

      {loading ? (
        <div className="px-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        </div>
      ) : (
        <div className="px-6 space-y-3 pb-24">
          {notes.map(note => {
            const isMine = note.author_id === user?.id;
            return (
              <div
                key={note.id}
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  isMine
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                    : "mr-auto bg-card border border-border text-foreground rounded-bl-md"
                )}
              >
                <p className="text-sm">{note.content}</p>
                <p className={cn(
                  "text-[10px] mt-1",
                  isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <NoteThreadComposer postId={postId || ""} postOwnerId={postOwner || ""} onSent={loadThread} />
    </div>
  );
}

function NoteThreadComposer({ postId, postOwnerId, onSent }: { postId: string; postOwnerId: string; onSent: () => void }) {
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

      if (postOwnerId && postOwnerId !== user.id) {
        await supabase.from("activity").insert({
          actor_id: user.id,
          user_id: postOwnerId,
          type: "note",
          reference_id: postId,
        });
      }

      setContent("");
      onSent();
    } catch (err) {
      toast.error(mapErrorToUserMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg px-4 py-3">
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 140))}
          placeholder="Reply..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1">{content.length}/140</p>
    </div>
  );
}
