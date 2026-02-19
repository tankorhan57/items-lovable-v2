import { useState } from "react";
import { Camera } from "lucide-react";

const categoryBg: Record<string, string> = {
  color: "bg-[hsl(350,20%,96%)]",
  light: "bg-[hsl(45,20%,96%)]",
  environment: "bg-[hsl(140,15%,96%)]",
  surface: "bg-[hsl(30,12%,96%)]",
  texture: "bg-[hsl(25,14%,96%)]",
  time: "bg-[hsl(220,15%,96%)]",
  movement: "bg-[hsl(200,12%,96%)]",
};

interface DailyImmersionProps {
  promptText: string;
  category: string;
  onBegin: () => void;
}

export default function DailyImmersion({ promptText, category, onBegin }: DailyImmersionProps) {
  const bg = categoryBg[category] || "bg-background";

  const handleBegin = () => {
    // Mark as seen for this UTC day
    const utcDate = new Date().toISOString().split("T")[0];
    sessionStorage.setItem("immersion_seen", utcDate);
    onBegin();
  };

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 ${bg} animate-fade-in`}>
      <div className="text-center max-w-sm">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6">Today's Item</p>
        <h1 className="text-3xl font-serif italic text-foreground leading-snug">
          "{promptText}"
        </h1>
      </div>

      <button
        onClick={handleBegin}
        className="mt-16 flex flex-col items-center gap-2 animate-delayed-fade-in"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 transition-ritual active:scale-[0.96]">
          <Camera className="h-6 w-6 text-foreground/40" />
        </div>
        <span className="text-xs text-muted-foreground">Begin</span>
      </button>
    </div>
  );
}
