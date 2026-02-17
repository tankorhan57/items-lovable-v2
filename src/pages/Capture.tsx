import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function Capture() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<{ id: string; prompt_text: string } | null>(null);
  const [hasPosted, setHasPosted] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDailyState();
  }, [user]);

  const loadDailyState = async () => {
    if (!user) return;

    const { data: item } = await supabase
      .from("daily_items")
      .select("*")
      .eq("active_date", new Date().toISOString().split("T")[0])
      .single();

    if (item) {
      setPrompt(item);

      const { data: post } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("daily_item_id", item.id)
        .maybeSingle();

      if (post?.confirmed_at) {
        setHasPosted(true);
        setConfirmed(true);
        setPreview(post.image_url);
      }

      // Get today's participant count
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("daily_item_id", item.id)
        .not("confirmed_at", "is", null);
      setTodayCount(count || 0);

      // Get user streak
      const { data: streak } = await supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      setStreakCount(streak?.current_streak || 0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleConfirm = async () => {
    if (!file || !user || !prompt) return;
    setConfirming(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(path);

      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        daily_item_id: prompt.id,
        image_url: publicUrl,
        confirmed_at: new Date().toISOString(),
      });
      if (postError) throw postError;

      setConfirmed(true);
      setHasPosted(true);
      toast.success("Your moment is captured");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleRetake = () => {
    setFile(null);
    setPreview(null);
  };

  if (!prompt) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <h2 className="text-2xl font-serif text-foreground mb-2">No prompt today</h2>
          <p className="text-sm text-muted-foreground">Check back soon — the next Item is on its way.</p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-scale-in">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-serif text-foreground mb-1">Captured</h2>
          <p className="text-sm text-muted-foreground">You contributed to today's world.</p>
          {todayCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {todayCount} {todayCount === 1 ? "person" : "people"} captured today
            </p>
          )}
          {streakCount > 0 && (
            <p className="text-xs text-primary font-medium mt-1">
              🔥 {streakCount}-day streak. Keep going.
            </p>
          )}
        </div>
        {preview && (
          <div className="w-full max-w-xs overflow-hidden rounded-xl shadow-card">
            <img src={preview} alt="Your capture" className="w-full aspect-square object-cover" />
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground italic font-serif">"{prompt.prompt_text}"</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Today's Item</p>
          <h2 className="text-3xl font-serif text-foreground italic">"{prompt.prompt_text}"</h2>
        </div>

        {preview ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl shadow-card">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={confirming}>
                <Check className="mr-2 h-4 w-4" />
                {confirming ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="group mx-auto flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <Camera className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Tap to capture
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
