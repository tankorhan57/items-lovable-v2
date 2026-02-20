import { useState, useRef, useEffect } from "react";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Check, RotateCcw, MapPin } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import { getCurrentPosition } from "@/lib/geolocation";
import DailyImmersion from "@/components/DailyImmersion";

export default function Capture() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<{ id: string; prompt_text: string; category: string } | null>(null);
  const [hasPosted, setHasPosted] = useState(false);
  const [showImmersion, setShowImmersion] = useState(false);
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
      } else {
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
      <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-scale-in">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">Today's Item</p>
          <h1 className="text-[28px] font-serif text-foreground italic leading-[1.2] mb-4">"{prompt.prompt_text}"</h1>
          <p className="text-[15px] text-muted-foreground">You contributed to today's world.</p>
          {todayCount > 1 && (
            <p className="text-meta mt-3">{todayCount} people are seeing the world this way today.</p>
          )}
          {streakCount > 1 && (
            <p className="text-meta mt-1">{streakCount} days of continuity</p>
          )}
          {city && (
            <div className="flex items-center justify-center gap-1.5 text-meta mt-3">
              <MapPin className="h-3.5 w-3.5" />
              <span>{city}</span>
            </div>
          )}
        </div>
        {preview && (
          <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-elevated">
            <img src={preview} alt="Your capture" className="w-full aspect-square object-cover" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">Today's Item</p>
          <h1 className="text-[28px] font-serif text-foreground italic leading-[1.2]">"{prompt.prompt_text}"</h1>
        </div>

        {preview ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl shadow-elevated">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl tap-scale" onClick={handleRetake}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button className="flex-1 h-12 rounded-xl tap-scale" onClick={handleConfirm} disabled={confirming}>
                <Check className="mr-2 h-4 w-4" />
                {confirming ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="group mx-auto flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card shadow-soft transition-all duration-200 hover:border-primary/30 hover:shadow-card tap-scale"
          >
            <Camera className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
            <span className="text-[15px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Tap to capture
            </span>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
}
