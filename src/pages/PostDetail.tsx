import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AppreciateButton from "@/components/AppreciateButton";
import AppreciatorsModal from "@/components/AppreciatorsModal";
import NoteComposer from "@/components/NoteComposer";
import { MessageSquare } from "lucide-react";
import RitualAvatar from "@/components/RitualAvatar";

interface PostData {
  id: string;
  image_url: string;
  city: string | null;
  confirmed_at: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function PostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appreciatorsOpen, setAppreciatorsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    if (postId && user) loadPost();
  }, [postId, user]);

  const loadPost = async () => {
    if (!postId) return;
    const { data } = await supabase
      .from("posts")
      .select("id, image_url, city, confirmed_at, user_id")
      .eq("id", postId)
      .single();

    if (!data) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", data.user_id)
      .single();

    setPost({
      ...data,
      confirmed_at: data.confirmed_at!,
      username: profile?.username || "unknown",
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground">Post not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-primary">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg px-4 pt-12 pb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-foreground">Post</p>
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-1">
        <div className="rounded-xl overflow-hidden bg-muted animate-scale-in">
          <img
            src={post.image_url}
            alt=""
            className="w-full object-cover max-h-[70vh]"
          />
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="flex items-center gap-3">
            <RitualAvatar
              src={post.avatar_url}
              fallback={post.username[0]?.toUpperCase()}
              size="md"
            />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{post.display_name || post.username}</p>
              <p className="text-meta">@{post.username}</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <AppreciateButton
              postId={post.id}
              postOwnerId={post.user_id}
              onShowAppreciators={() => setAppreciatorsOpen(true)}
            />
            <button onClick={() => setNoteOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-meta">
              {format(new Date(post.confirmed_at), "MMM d, yyyy • HH:mm")}
            </p>
            {post.city && (
              <p className="text-meta">{post.city}</p>
            )}
          </div>
          {post.user_id === user?.id && (
            <button
              onClick={async () => {
                const { error } = await supabase
                  .from("posts")
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", post.id);
                if (error) {
                  toast.error("Failed to delete");
                } else {
                  toast.success("Post removed");
                  navigate(-1);
                }
              }}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <AppreciatorsModal
        postId={appreciatorsOpen ? post.id : null}
        open={appreciatorsOpen}
        onClose={() => setAppreciatorsOpen(false)}
      />

      <NoteComposer
        postId={noteOpen ? post.id : null}
        postOwnerId={post.user_id}
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
      />
    </div>
  );
}
