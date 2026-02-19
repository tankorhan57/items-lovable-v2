import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import {
  useReactionConfig,
  REACTION_TYPES,
  ANIMATION_PRESETS,
  type DirectionKey,
  type SwipeMode,
  type AnimationPreset,
  type ReactionConfig,
} from "@/hooks/use-reaction-config";
import SwipeReaction from "@/components/SwipeReaction";

const DIRECTIONS: DirectionKey[] = ["up", "right", "down", "left"];
const DIRECTION_LABELS: Record<DirectionKey, string> = {
  up: "↑ Up",
  down: "↓ Down",
  left: "← Left",
  right: "→ Right",
};

export default function ReactionSettings() {
  const navigate = useNavigate();
  const { config, saveConfig, loading } = useReactionConfig();
  const [local, setLocal] = useState<ReactionConfig>(config);
  const [previewReaction, setPreviewReaction] = useState<DirectionKey | null>(null);

  useEffect(() => {
    if (!loading) setLocal(config);
  }, [config, loading]);

  const updateMapping = (dir: DirectionKey, reactionId: string) => {
    setLocal(prev => ({
      ...prev,
      mapping: { ...prev.mapping, [dir]: reactionId },
    }));
  };

  const updateAnimation = (dir: DirectionKey, preset: AnimationPreset) => {
    setLocal(prev => ({
      ...prev,
      animationPresetMapping: { ...prev.animationPresetMapping, [dir]: preset },
    }));
  };

  const handleSave = async () => {
    await saveConfig(local);
    toast.success("Reaction settings saved");
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-serif text-foreground">Reactions</h1>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Check className="h-4 w-4" />
            Save
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Mode</label>
          <div className="flex gap-2">
            {(["direction", "corner"] as SwipeMode[]).map(m => (
              <button
                key={m}
                onClick={() => setLocal(prev => ({ ...prev, mode: m }))}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  local.mode === m
                    ? "bg-foreground/10 text-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {m === "direction" ? "4 Directions" : "4 Corners"}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview sandbox */}
        <div className="mb-8">
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Preview</label>
          <div className="rounded-xl border border-border overflow-hidden">
            <SwipeReaction
              currentReaction={previewReaction}
              disabled={false}
              onReact={(dir) => {
                setPreviewReaction(prev => prev === dir ? null : dir);
              }}
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Swipe to preview</p>
              </div>
            </SwipeReaction>
          </div>
        </div>

        {/* Direction mappings */}
        <div className="space-y-5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground block">Direction Mapping</label>
          {DIRECTIONS.map(dir => (
            <div key={dir} className="space-y-2 border-b border-border pb-4 last:border-0">
              <p className="text-sm font-medium text-foreground">{DIRECTION_LABELS[dir]}</p>

              {/* Reaction type selection */}
              <div className="flex gap-2 flex-wrap">
                {REACTION_TYPES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => updateMapping(dir, r.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                      local.mapping[dir] === r.id
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Animation preset selection */}
              <div className="flex gap-2 flex-wrap">
                {ANIMATION_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => updateAnimation(dir, p.id)}
                    className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                      local.animationPresetMapping[dir] === p.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
