import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
      <div className="px-6 pt-12 pb-4">
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
        <div className="px-6 space-y-3 pb-6">
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
    </div>
  );
}
