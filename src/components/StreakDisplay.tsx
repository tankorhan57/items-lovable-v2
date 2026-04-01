import { Flame, Shield, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface StreakDisplayProps {
  streak: number;
  longestStreak: number;
  graceUsed: boolean;
  lastPostedDate: string | null;
  showMilestones?: boolean;
}

const MILESTONES = [2, 5, 14, 50];

function getMilestone(streak: number): number | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= MILESTONES[i]) return MILESTONES[i];
  }
  return null;
}

function getMilestoneLabel(milestone: number): string {
  switch (milestone) {
    case 2: return "2 days";
    case 5: return "5 days";
    case 14: return "2 weeks";
    case 50: return "50 days";
    default: return `${milestone} days`;
  }
}

function getStreakStatus(streak: number, graceUsed: boolean, lastPostedDate: string | null): "safe" | "grace-available" | "grace-used" | "at-risk" {
  if (!lastPostedDate || streak === 0) return "safe";
  
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];
  
  if (lastPostedDate === today) return "safe";
  if (lastPostedDate === yesterday) return graceUsed ? "at-risk" : "safe";
  if (lastPostedDate === twoDaysAgo && !graceUsed) return "grace-available";
  return "at-risk";
}

export default function StreakDisplay({ streak, longestStreak, graceUsed, lastPostedDate, showMilestones = true }: StreakDisplayProps) {
  const [celebratedKey, setCelebratedKey] = useState("");
  const milestone = getMilestone(streak);
  const status = getStreakStatus(streak, graceUsed, lastPostedDate);

  // Celebrate milestone once per streak value
  useEffect(() => {
    if (!showMilestones || !milestone || streak === 0) return;
    const key = `streak_celebrated_${milestone}`;
    if (celebratedKey === key) return;
    const alreadyCelebrated = sessionStorage.getItem(key);
    if (!alreadyCelebrated && MILESTONES.includes(streak)) {
      sessionStorage.setItem(key, "true");
      setCelebratedKey(key);
      toast(`🔥 ${getMilestoneLabel(streak)} streak!`, {
        description: "Your consistency is inspiring.",
        duration: 4000,
      });
    }
  }, [streak, milestone, showMilestones]);

  if (streak === 0 && status !== "grace-available") return null;

  return (
    <div className="space-y-1.5 mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-foreground" />
          <p className="text-[13px]">
            <span className="font-bold text-foreground">{streak}</span>{" "}
            <span className="text-muted-foreground">day{streak !== 1 ? "s" : ""}</span>
          </p>
        </div>
        {longestStreak > 0 && longestStreak >= streak && (
          <p className="text-[13px]">
            <span className="text-muted-foreground">best:</span>{" "}
            <span className="font-bold text-foreground">{longestStreak}</span>
          </p>
        )}
        {milestone && showMilestones && (
          <div className="flex items-center gap-1 text-[11px] text-primary">
            <Award className="h-3.5 w-3.5" />
            <span className="font-medium">{getMilestoneLabel(milestone)}</span>
          </div>
        )}
      </div>
      
      {/* Grace/Risk status */}
      {status === "grace-available" && (
        <div className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Grace day available — post today to keep your streak!</span>
        </div>
      )}
      {status === "at-risk" && streak > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] text-destructive">
          <Flame className="h-3.5 w-3.5" />
          <span>Post today or your streak resets!</span>
        </div>
      )}
      {status === "grace-used" && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Grace day used this streak</span>
        </div>
      )}
    </div>
  );
}
