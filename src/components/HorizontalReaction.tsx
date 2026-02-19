import { useRef, useEffect, useState, useCallback, type ReactNode } from "react";
import { useReactionConfig, type DirectionKey, REACTION_TYPES } from "@/hooks/use-reaction-config";
import type { HorizontalSwipeState } from "@/components/PhotoFeedPager";

export type ReactionDirection = "left" | "right";

const THRESHOLD = 50;           // px to commit
const VELOCITY_THRESHOLD = 0.25; // px/ms
const MAX_DRAG = 200;
const ROTATION_FACTOR = 0.08;   // degrees per px — slightly more dramatic
const SETTLE_MS = 220;

interface HorizontalReactionProps {
  children: ReactNode;
  currentReaction: DirectionKey | null;
  disabled?: boolean;
  onReact: (direction: DirectionKey) => void;
  /** Driven by parent pager's unified gesture coordinator */
  swipeState?: HorizontalSwipeState;
}

/**
 * Pure visual layer for horizontal swipe reactions.
 * No touch handlers — all gesture input comes via swipeState prop
 * from the parent PhotoFeedPager's unified gesture coordinator.
 */
export default function HorizontalReaction({
  children,
  currentReaction,
  disabled,
  onReact,
  swipeState,
}: HorizontalReactionProps) {
  const { getReactionForDirection } = useReactionConfig();
  const [commitAnim, setCommitAnim] = useState<{ dir: DirectionKey; reaction: typeof REACTION_TYPES[number] } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const overlayLeftRef = useRef<HTMLDivElement>(null);
  const overlayRightRef = useRef<HTMLDivElement>(null);
  const lastDxRef = useRef(0);
  const startTimeRef = useRef(0);

  const clamp = (v: number) => Math.max(-MAX_DRAG, Math.min(MAX_DRAG, v));

  const applyVisuals = useCallback((dx: number) => {
    const el = contentRef.current;
    if (!el) return;
    const clamped = clamp(dx);
    const rotation = clamped * ROTATION_FACTOR;
    el.style.transition = "none";
    el.style.transform = `translateX(${clamped}px) rotate(${rotation}deg)`;

    const progress = Math.min(1, Math.abs(clamped) / THRESHOLD);
    const leftOverlay = overlayLeftRef.current;
    const rightOverlay = overlayRightRef.current;
    if (leftOverlay) {
      leftOverlay.style.opacity = clamped < -15 ? String(Math.min(1, progress * 1.3)) : "0";
      leftOverlay.style.transform = `scale(${0.5 + progress * 0.5})`;
    }
    if (rightOverlay) {
      rightOverlay.style.opacity = clamped > 15 ? String(Math.min(1, progress * 1.3)) : "0";
      rightOverlay.style.transform = `scale(${0.5 + progress * 0.5})`;
    }
  }, []);

  const resetVisuals = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    el.style.transform = "translateX(0) rotate(0deg)";
    const leftOverlay = overlayLeftRef.current;
    const rightOverlay = overlayRightRef.current;
    if (leftOverlay) { leftOverlay.style.opacity = "0"; leftOverlay.style.transform = "scale(0.5)"; }
    if (rightOverlay) { rightOverlay.style.opacity = "0"; rightOverlay.style.transform = "scale(0.5)"; }
  }, []);

  // React to swipeState changes from parent
  useEffect(() => {
    if (!swipeState || disabled) return;

    if (swipeState.phase === "dragging") {
      if (lastDxRef.current === 0 && swipeState.dx !== 0) {
        startTimeRef.current = Date.now();
      }
      lastDxRef.current = swipeState.dx;
      requestAnimationFrame(() => applyVisuals(swipeState.dx));
    } else if (swipeState.phase === "ended") {
      const dx = lastDxRef.current;
      const elapsed = Date.now() - startTimeRef.current + 1;
      const velocity = Math.abs(dx) / elapsed;
      const exceeded = Math.abs(dx) > THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (exceeded && Math.abs(dx) > 20) {
        const dir: DirectionKey = dx > 0 ? "right" : "left";
        const reaction = getReactionForDirection(dir);
        setCommitAnim({ dir, reaction });
        setTimeout(() => setCommitAnim(null), 600);
        onReact(dir);
        if (navigator.vibrate) navigator.vibrate(18);
      }

      lastDxRef.current = 0;
      resetVisuals();
    }
  }, [swipeState, disabled, applyVisuals, resetVisuals, getReactionForDirection, onReact]);

  const currentReactionInfo = currentReaction ? getReactionForDirection(currentReaction) : null;
  const leftReaction = getReactionForDirection("left");
  const rightReaction = getReactionForDirection("right");

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Left reaction overlay (swipe left) */}
      <div
        ref={overlayLeftRef}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none"
        style={{ opacity: 0, transform: "scale(0.5)", transition: "none" }}
      >
        <span className="text-5xl drop-shadow-lg">{leftReaction.icon}</span>
        <span className="text-xs font-medium text-white/90 drop-shadow">{leftReaction.label}</span>
      </div>

      {/* Right reaction overlay (swipe right) */}
      <div
        ref={overlayRightRef}
        className="absolute left-8 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none"
        style={{ opacity: 0, transform: "scale(0.5)", transition: "none" }}
      >
        <span className="text-5xl drop-shadow-lg">{rightReaction.icon}</span>
        <span className="text-xs font-medium text-white/90 drop-shadow">{rightReaction.label}</span>
      </div>

      {/* Commit animation overlay */}
      {commitAnim && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-reaction-commit">
          <div className="flex flex-col items-center gap-1">
            <span className="text-6xl drop-shadow-lg">{commitAnim.reaction.icon}</span>
            <span className="text-xs font-semibold text-white/95 drop-shadow">{commitAnim.reaction.label}</span>
          </div>
        </div>
      )}

      {/* Current reaction badge */}
      {currentReactionInfo && !commitAnim && (
        <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 animate-scale-in">
          <span className="text-sm">{currentReactionInfo.icon}</span>
          <span className="text-[10px] text-white/80">{currentReactionInfo.label}</span>
        </div>
      )}

      {/* Content — no touch handlers, pager owns all gestures */}
      <div
        ref={contentRef}
        className="h-full w-full"
        style={{ willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
