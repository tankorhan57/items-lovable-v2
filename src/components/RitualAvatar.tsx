import { forwardRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface RitualAvatarProps {
  src?: string | null;
  fallback?: string;
  streak?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

type MilestoneTier = "none" | "week" | "month" | "century" | "year";

function getMilestoneTier(streak: number): MilestoneTier {
  if (streak >= 50) return "year";
  if (streak >= 14) return "century";
  if (streak >= 5) return "month";
  if (streak >= 2) return "week";
  return "none";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const;

const ringPadding = {
  sm: "p-[2px]",
  md: "p-[2.5px]",
  lg: "p-[3px]",
} as const;

const RitualAvatar = forwardRef<HTMLDivElement, RitualAvatarProps>(
  ({ src, fallback, streak = 0, size = "md", className }, ref) => {
    const tier = getMilestoneTier(streak);

    if (tier === "none") {
      return (
        <Avatar
          className={cn(sizeMap[size], "transition-all duration-300 ease-out", className)}
        >
          {src && (
            <AvatarImage src={src} alt="" className="transition-opacity duration-300 ease-in-out" />
          )}
          <AvatarFallback className="bg-secondary text-muted-foreground font-serif">
            {fallback || "?"}
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full transition-all duration-300 ease-out",
          ringPadding[size],
          `streak-ring-${tier}`,
          className
        )}
      >
        <Avatar className={cn(sizeMap[size])}>
          {src && (
            <AvatarImage src={src} alt="" className="transition-opacity duration-300 ease-in-out" />
          )}
          <AvatarFallback className="bg-secondary text-muted-foreground font-serif">
            {fallback || "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
);

RitualAvatar.displayName = "RitualAvatar";

export default RitualAvatar;
