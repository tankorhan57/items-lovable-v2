import { Camera } from "lucide-react";

interface DailyImmersionProps {
  promptText: string;
  category: string;
  onBegin: () => void;
}

export default function DailyImmersion({ promptText, category, onBegin }: DailyImmersionProps) {
  const handleBegin = () => {
    const utcDate = new Date().toISOString().split("T")[0];
    sessionStorage.setItem("immersion_seen", utcDate);
    onBegin();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 bg-background animate-fade-in">
      <div className="text-center max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-8">Today's Item</p>
        <h1 className="text-[32px] font-serif italic text-foreground leading-[1.2]">
          "{promptText}"
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
