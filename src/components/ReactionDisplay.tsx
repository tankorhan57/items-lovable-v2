import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REACTION_TYPES, type DirectionKey } from "@/hooks/use-reaction-config";

interface ReactionDisplayProps {
  postId: string;
  isOwner: boolean;
  refreshKey?: number;
  compact?: boolean;
}

type ReactionCounts = Record<string, number>;

const DIRECTIONS: DirectionKey[] = ["right", "up", "left", "down"];

export default function ReactionDisplay({ postId, isOwner, refreshKey, compact }: ReactionDisplayProps) {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    loadCounts();
  }, [postId, refreshKey]);

  const loadCounts = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", postId);

    if (!data) return;
    const c: ReactionCounts = {};
    data.forEach((r) => {
      c[r.reaction_type] = (c[r.reaction_type] || 0) + 1;
    });
    setCounts(c);
  };

  if (total === 0) return null;

  const getReaction = (id: string) => REACTION_TYPES.find(r => r.id === id);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
        {DIRECTIONS.filter(d => counts[d] > 0).map(d => getReaction(d)?.icon).join("")}
        {" "}{total}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isOwner
        ? DIRECTIONS.map(d =>
            counts[d] > 0 && (
              <span key={d} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                <span>{getReaction(d)?.icon}</span>
                <span>{counts[d]}</span>
              </span>
            )
          )
        : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
            {DIRECTIONS.filter(d => counts[d] > 0).map(d => getReaction(d)?.icon).join("")}{" "}{total}
          </span>
        )}
    </div>
  );
}
