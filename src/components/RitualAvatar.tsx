import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface RitualAvatarProps {
  src?: string | null;
  fallback?: string;
  streak?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getStreakRingClass(streak: number): string {
  if (streak >= 100) return "ring-2 ring-foreground/30";
  if (streak >= 30) return "ring-2 ring-foreground/20";
  if (streak >= 7) return "ring-[1.5px] ring-foreground/12";
  return "";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const;

export default function RitualAvatar({ src, fallback, streak = 0, size = "md", className }: RitualAvatarProps) {
  const ringClass = getStreakRingClass(streak);

  return (
    <Avatar
      className={cn(
        sizeMap[size],
        ringClass,
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {src && (
        <AvatarImage
          src={src}
          alt=""
          className="transition-opacity duration-300 ease-in-out"
        />
      )}
      <AvatarFallback className="bg-secondary text-muted-foreground font-serif">
        {fallback || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
