import { useEffect, useState, useCallback } from "react";
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
import SwipeReaction from "@/components/SwipeReaction";
import ReactionDisplay from "@/components/ReactionDisplay";
import type { ReactionDirection } from "@/components/SwipeReaction";

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
  const [myReaction, setMyReaction] = useState<ReactionDirection | null>(null);
  const [reactionRefresh, setReactionRefresh] = useState(0);
  const [showNotePrompt, setShowNotePrompt] = useState(false);

  useEffect(() => {
    if (postId && user) {
      loadPost();
      loadMyReaction();
    }
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

  const loadMyReaction = async () => {
    if (!postId || !user) return;
    const { data } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyReaction((data?.reaction_type as ReactionDirection) || null);
  };

  const handleReact = useCallback(async (direction: ReactionDirection) => {
    if (!user || !postId || !post) return;
    if (post.user_id === user.id) return; // can't react to own

    // If same reaction, remove it
    if (myReaction === direction) {
      setMyReaction(null);
      setReactionRefresh((r) => r + 1);
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      return;
    }

    // Optimistic
    const isNew = !myReaction;
    setMyReaction(direction);
    setReactionRefresh((r) => r + 1);

    if (isNew) {
      await supabase.from("post_reactions").insert({
        user_id: user.id,
        post_id: postId,
        reaction_type: direction,
      });
    } else {
      await supabase
        .from("post_reactions")
        .update({ reaction_type: direction })
        .eq("post_id", postId)
        .eq("user_id", user.id);
    }

    // Show subtle note prompt
    setShowNotePrompt(true);
    setTimeout(() => setShowNotePrompt(false), 3000);
  }, [user, postId, post, myReaction]);

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
        <SwipeReaction
          currentReaction={myReaction}
          disabled={post.user_id === user?.id}
          onReact={handleReact}
        >
          <div className="bg-muted animate-scale-in">
            <img
              src={post.image_url}
              alt=""
              className="w-full object-cover max-h-[70vh]"
            />
          </div>
        </SwipeReaction>
      </div>

      {/* Subtle note prompt after reacting */}
      {showNotePrompt && (
        <div className="px-6 pt-2 animate-fade-in">
          <button
            onClick={() => { setShowNotePrompt(false); setNoteOpen(true); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Add a note? →
          </button>
        </div>
      )}

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

        <ReactionDisplay
          postId={post.id}
          isOwner={post.user_id === user?.id}
          refreshKey={reactionRefresh}
        />

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
