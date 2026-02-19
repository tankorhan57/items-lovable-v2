import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REACTION_MAP, type ReactionDirection } from "./SwipeReaction";

interface ReactionDisplayProps {
  postId: string;
  isOwner: boolean;
  /** Bumped externally to trigger refresh */
  refreshKey?: number;
}

type ReactionCounts = Record<ReactionDirection, number>;

const EMPTY: ReactionCounts = { up: 0, down: 0, left: 0, right: 0 };
const DIRECTIONS: ReactionDirection[] = ["right", "up", "left", "down"];

export default function ReactionDisplay({ postId, isOwner, refreshKey }: ReactionDisplayProps) {
  const [counts, setCounts] = useState<ReactionCounts>(EMPTY);
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
    const c = { ...EMPTY };
    data.forEach((r) => {
      const t = r.reaction_type as ReactionDirection;
      if (t in c) c[t]++;
    });
    setCounts(c);
  };

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isOwner
        ? DIRECTIONS.map(
            (d) =>
              counts[d] > 0 && (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5"
                >
                  <span>{REACTION_MAP[d].icon}</span>
                  <span>{counts[d]}</span>
                </span>
              )
          )
        : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
            {DIRECTIONS.filter((d) => counts[d] > 0)
              .map((d) => REACTION_MAP[d].icon)
              .join("")}{" "}
            {total}
          </span>
        )}
    </div>
  );
}
