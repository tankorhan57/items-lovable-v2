import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export type SwipeMode = "direction" | "corner";
export type DirectionKey = "up" | "down" | "left" | "right";
export type AnimationPreset = "slide" | "pop" | "stamp" | "ripple" | "glow";

export const ANIMATION_PRESETS: { id: AnimationPreset; label: string }[] = [
  { id: "slide", label: "Slide + Fade" },
  { id: "pop", label: "Pop + Settle" },
  { id: "stamp", label: "Stamp" },
  { id: "ripple", label: "Ripple Burst" },
  { id: "glow", label: "Soft Glow" },
];

export const REACTION_TYPES = [
  { id: "up", label: "Fire", icon: "🔥" },
  { id: "down", label: "Calm", icon: "🌊" },
  { id: "left", label: "Hmm", icon: "🤔" },
  { id: "right", label: "Love", icon: "❤️" },
] as const;

export interface ReactionConfig {
  mode: SwipeMode;
  mapping: Record<DirectionKey, string>;
  animationPresetMapping: Record<DirectionKey, AnimationPreset>;
}

const DEFAULT_CONFIG: ReactionConfig = {
  mode: "direction",
  mapping: { up: "up", down: "down", left: "left", right: "right" },
  animationPresetMapping: { up: "pop", down: "pop", left: "slide", right: "slide" },
};

export function useReactionConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ReactionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const cachedRef = useRef(false);

  useEffect(() => {
    if (!user || cachedRef.current) { setLoading(false); return; }
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_reaction_config")
      .select("mode, mapping, animation_preset_mapping")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setConfig({
        mode: data.mode as SwipeMode,
        mapping: data.mapping as Record<DirectionKey, string>,
        animationPresetMapping: data.animation_preset_mapping as Record<DirectionKey, AnimationPreset>,
      });
    }
    cachedRef.current = true;
    setLoading(false);
  };

  const saveConfig = useCallback(async (newConfig: ReactionConfig) => {
    if (!user) return;
    setConfig(newConfig);

    const payload = {
      user_id: user.id,
      mode: newConfig.mode,
      mapping: newConfig.mapping,
      animation_preset_mapping: newConfig.animationPresetMapping,
    };

    const { error } = await supabase
      .from("user_reaction_config")
      .upsert(payload, { onConflict: "user_id" });

    if (error) console.error("Failed to save reaction config:", error);
  }, [user]);

  const getReactionForDirection = useCallback((dir: DirectionKey) => {
    const reactionId = config.mapping[dir];
    return REACTION_TYPES.find(r => r.id === reactionId) || REACTION_TYPES[0];
  }, [config]);

  const getAnimationForDirection = useCallback((dir: DirectionKey) => {
    return config.animationPresetMapping[dir] || "pop";
  }, [config]);

  return { config, loading, saveConfig, getReactionForDirection, getAnimationForDirection };
}
