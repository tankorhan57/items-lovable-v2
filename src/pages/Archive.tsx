import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, getISOWeek } from "date-fns";

interface ArchiveItem {
  id: string;
  prompt_text: string;
  active_date: string;
  category: string;
  depth_level: number;
  tone: string;
  week_number: number | null;
}

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
      .select("id, prompt_text, active_date, category, depth_level, tone, week_number")
      .lte("active_date", today)
      .order("active_date", { ascending: false })
      .limit(14);

    setItems((data as ArchiveItem[]) || []);
    setLoading(false);
  };

  const getWeekKey = (item: ArchiveItem): number => {
    if (item.week_number != null) return item.week_number;
    return getISOWeek(new Date(item.active_date + "T00:00:00"));
  };

  // Group items by week
  const groupedByWeek: { week: number; items: ArchiveItem[] }[] = [];
  let currentWeek: number | null = null;
  items.forEach((item) => {
    const wk = getWeekKey(item);
    if (wk !== currentWeek) {
      groupedByWeek.push({ week: wk, items: [item] });
      currentWeek = wk;
    } else {
      groupedByWeek[groupedByWeek.length - 1].items.push(item);
    }
  });

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Archive</h1>
            <p className="text-meta mt-0.5">Last 14 prompts</p>
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
          <p className="text-meta text-center">No prompts yet.</p>
        </div>
      ) : (
        <div className="px-6 py-6 space-y-0">
          {groupedByWeek.map(({ week, items: weekItems }, gi) => (
            <div key={week}>
              <p className="text-meta pt-6 pb-2">{gi === 0 ? "This week" : `Week ${week}`}</p>
              <div className="space-y-3">
                {weekItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-card border border-border p-4 animate-fade-in"
                    style={{ animationDelay: `${(gi * weekItems.length + i) * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-foreground italic text-lg leading-snug">
                          "{item.prompt_text}"
                        </p>
                        <p className="text-meta mt-2">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
