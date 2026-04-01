import { useState, useRef, useEffect, useCallback } from "react";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Check, RotateCcw, MapPin } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import { getCurrentPosition } from "@/lib/geolocation";
import DailyImmersion from "@/components/DailyImmersion";
import PromptGame from "@/components/PromptGame";

export default function Capture() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<{ id: string; prompt_text: string; category: string } | null>(null);
  const [hasPosted, setHasPosted] = useState(false);
  const [showImmersion, setShowImmersion] = useState(false);
  const [gameDone, setGameDone] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
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
        setGameDone(true);
      } else {
        // Check if game already played today
        const dateKey = new Date().toISOString().split("T")[0];
        const gameResult = localStorage.getItem(`items-game-${dateKey}`);
        if (gameResult !== null) {
          setGameDone(true);
        }
        const utcDate = new Date().toISOString().split("T")[0];
        const seen = sessionStorage.getItem("immersion_seen");
        if (seen !== utcDate) setShowImmersion(true);
      }

      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("daily_item_id", item.id)
        .not("confirmed_at", "is", null);
      setTodayCount(count || 0);

      const { data: streak } = await supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      setStreakCount(streak?.current_streak || 0);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    const pos = await getCurrentPosition();
    if (pos) {
      setCoords(pos);
      try {
        const { data } = await supabase.functions.invoke("reverse-geocode", {
          body: { lat: pos.lat, lng: pos.lng },
        });
        if (data?.city) setCity(data.city);
      } catch {}
    }
  };

  const handleConfirm = async () => {
    if (!file || !user || !prompt) return;
    setConfirming(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, compressed);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        daily_item_id: prompt.id,
        image_url: publicUrl,
        confirmed_at: new Date().toISOString(),
        city: city || null,
      });
      if (postError) throw postError;
      setConfirmed(true);
      setHasPosted(true);
      toast.success("Your moment is captured");
    } catch (err: unknown) {
      toast.error(mapErrorToUserMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleRetake = () => {
    setFile(null);
    setPreview(null);
    setCoords(null);
    setCity(null);
  };

  const handleGameComplete = useCallback((_wrongGuesses: number) => {
    setGameDone(true);
  }, []);

  if (!prompt) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <h2 className="text-foreground mb-2">No prompt today</h2>
          <p className="text-meta">Check back soon — the next Item is on its way.</p>
        </div>
      </div>
    );
  }

  // Game gate — show before immersion if not yet played and not already posted
  if (!gameDone && prompt && !hasPosted) {
    const dateKey = new Date().toISOString().split("T")[0];
    return (
      <PromptGame
        prompt={prompt.prompt_text}
        dailyItemId={prompt.id}
        dateKey={dateKey}
        onComplete={handleGameComplete}
      />
    );
  }

  if (showImmersion) {
    return (
      <DailyImmersion
        promptText={prompt.prompt_text}
        category={prompt.category}
        onBegin={() => setShowImmersion(false)}
      />
    );
  }

  /* ── Confirmation screen ── */
  if (confirmed) {
    return (
      <div className="min-h-screen bg-background animate-scale-in flex flex-col">
        {/* Persistent prompt label */}
        <div className="px-4 pt-14 pb-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Today's Item</p>
          <p className="text-[14px] font-serif italic text-foreground mt-1">"{prompt.prompt_text}"</p>
        </div>

        {/* Image — edge-to-edge, grounded */}
        {preview && (
          <div className="mx-2 relative">
            <img
              src={preview}
              alt="Your capture"
              className="w-full rounded-lg object-cover"
              style={{ height: "63vh", boxShadow: "inset 0 8px 12px -4px rgba(0,0,0,0.02), inset 0 -8px 12px -4px rgba(0,0,0,0.02)" }}
            />
          </div>
        )}

        {/* Metadata below */}
        <div className="px-4 pt-3 pb-6">
          <p className="text-[15px] font-bold text-foreground">You contributed to today's world.</p>
          <div className="flex items-center gap-1.5 mt-1">
            {city && <span className="text-[12px] text-muted-foreground">{city}</span>}
            {city && todayCount > 1 && <span className="text-[12px] text-muted-foreground">·</span>}
            {todayCount > 1 && (
              <span className="text-[12px] text-muted-foreground">{todayCount} people seeing this today</span>
            )}
          </div>
          {streakCount > 1 && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{streakCount} days</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in flex flex-col">
      {/* Persistent prompt label */}
      <div className="px-4 pt-14 pb-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Today's Item</p>
        <p className="text-[14px] font-serif italic text-foreground mt-1">"{prompt.prompt_text}"</p>
      </div>

      <div className="flex-1 flex flex-col px-2">
        {preview ? (
          <>
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-lg object-cover"
                style={{ height: "63vh", boxShadow: "inset 0 8px 12px -4px rgba(0,0,0,0.02), inset 0 -8px 12px -4px rgba(0,0,0,0.02)" }}
              />
            </div>
            <div className="flex gap-3 mt-3 px-2">
              <Button variant="outline" className="flex-1 h-12 rounded-lg tap-scale" onClick={handleRetake}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button className="flex-1 h-12 rounded-lg tap-scale" onClick={handleConfirm} disabled={confirming}>
                <Check className="mr-2 h-4 w-4" />
                {confirming ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card shadow-soft transition-all duration-200 hover:border-primary/30 hover:shadow-card tap-scale"
            style={{ height: "63vh" }}
          >
            <Camera className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
            <span className="text-[15px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Tap to capture
            </span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
