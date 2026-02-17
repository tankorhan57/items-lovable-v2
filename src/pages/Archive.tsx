import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ArchiveItem {
  id: string;
  prompt_text: string;
  active_date: string;
  category: string;
  depth_level: number;
  tone: string;
}

const depthLabels = ["", "Concrete", "Concrete + Interpretation", "Light Emotional", "Reflective"];
const categoryEmoji: Record<string, string> = {
  color: "🎨",
  object: "📦",
  human: "👤",
  perspective: "👁",
  emotion: "💛",
  time: "⏳",
  contrast: "◐",
  environment: "🌿",
};

export default function Archive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadArchive();
  }, [user]);

  const loadArchive = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_items")
      .select("id, prompt_text, active_date, category, depth_level, tone")
      .lte("active_date", today)
      .order("active_date", { ascending: false })
      .limit(14);

    setItems((data as ArchiveItem[]) || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Archive</h1>
            <p className="text-xs text-muted-foreground">Last 14 prompts</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="text-sm text-muted-foreground text-center">No prompts yet.</p>
        </div>
      ) : (
        <div className="px-6 py-4 space-y-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="rounded-xl bg-card border border-border p-4 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-foreground italic text-lg leading-snug">
                    "{item.prompt_text}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(item.active_date + "T00:00:00"), "MMM d, yyyy")}
                  </p>
                </div>
                <span className="text-xl shrink-0" title={item.category}>
                  {categoryEmoji[item.category] || "•"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  Depth {item.depth_level}
                </span>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground capitalize">
                  {item.tone}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {depthLabels[item.depth_level]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
