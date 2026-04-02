import { Camera } from "lucide-react";

interface DailyImmersionProps {
  promptText: string;
  category: string;
  onBegin: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

export default function DailyImmersion({ promptText, category, onBegin }: DailyImmersionProps) {
  const handleBegin = () => {
    const utcDate = new Date().toISOString().split("T")[0];
    sessionStorage.setItem("immersion_seen", utcDate);
    onBegin();
  };

  const words = promptText.split(" ");

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
      style={{
        background: "linear-gradient(135deg, hsl(var(--background)), hsl(9 100% 58% / 0.06), hsl(var(--background)))",
        backgroundSize: "200% 200%",
        animation: "ambientShift 8s ease infinite",
      }}
    >
      <div className="text-center max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
          {getGreeting()}
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-8">Today's Item</p>
        <h1 className="text-[32px] font-serif italic text-foreground leading-[1.2]">
          "
          {words.map((word, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: 0,
                transform: "translateY(6px)",
                animation: "wordReveal 400ms ease forwards",
                animationDelay: `${i * 120}ms`,
                marginRight: "0.3em",
              }}
            >
              {word}
            </span>
          ))}
          "
        </h1>
      </div>

      <button
        onClick={handleBegin}
        className="mt-20 flex flex-col items-center gap-3 animate-delayed-fade-in tap-scale"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/[0.04] border border-border">
          <Camera className="h-6 w-6 text-foreground/40" />
        </div>
        <span className="text-[13px] text-muted-foreground font-medium">Begin</span>
      </button>
    </div>
  );
}
