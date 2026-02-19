import { useRef, useState, useCallback, type ReactNode } from "react";
import { useReactionConfig, type DirectionKey, REACTION_TYPES } from "@/hooks/use-reaction-config";

export type ReactionDirection = "left" | "right";

const THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.4; // px/ms
const MAX_DRAG = 200;
const ROTATION_FACTOR = 0.06; // degrees per pixel
const SETTLE_MS = 240;
const COMMIT_MS = 280;

interface HorizontalReactionProps {
  children: ReactNode;
  currentReaction: DirectionKey | null;
  disabled?: boolean;
  onReact: (direction: DirectionKey) => void;
}

export default function HorizontalReaction({
  children,
  currentReaction,
  disabled,
  onReact,
}: HorizontalReactionProps) {
  const { getReactionForDirection } = useReactionConfig();
  const [commitAnim, setCommitAnim] = useState<{ dir: DirectionKey; reaction: typeof REACTION_TYPES[number] } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayLeftRef = useRef<HTMLDivElement>(null);
  const overlayRightRef = useRef<HTMLDivElement>(null);

  const gesture = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    locked: false, // axis determined
    axis: null as "h" | "v" | null,
    isDragging: false,
    rafId: 0,
  });

  const clamp = (v: number) => Math.max(-MAX_DRAG, Math.min(MAX_DRAG, v));

  const applyVisuals = useCallback((dx: number) => {
    const el = contentRef.current;
    if (!el) return;
    const rotation = dx * ROTATION_FACTOR;
    el.style.transition = "none";
    el.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;

    // Update overlay opacity
    const progress = Math.min(1, Math.abs(dx) / THRESHOLD);
    const leftOverlay = overlayLeftRef.current;
    const rightOverlay = overlayRightRef.current;
    if (leftOverlay) {
      leftOverlay.style.opacity = dx < -20 ? String(Math.min(1, progress * 1.2)) : "0";
      leftOverlay.style.transform = `scale(${0.6 + progress * 0.4})`;
    }
    if (rightOverlay) {
      rightOverlay.style.opacity = dx > 20 ? String(Math.min(1, progress * 1.2)) : "0";
      rightOverlay.style.transform = `scale(${0.6 + progress * 0.4})`;
    }
  }, []);

  const resetVisuals = useCallback((animate = true) => {
    const el = contentRef.current;
    if (!el) return;
    if (animate) {
      el.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    }
    el.style.transform = "translateX(0) rotate(0deg)";
    const leftOverlay = overlayLeftRef.current;
    const rightOverlay = overlayRightRef.current;
    if (leftOverlay) { leftOverlay.style.opacity = "0"; leftOverlay.style.transform = "scale(0.6)"; }
    if (rightOverlay) { rightOverlay.style.opacity = "0"; rightOverlay.style.transform = "scale(0.6)"; }
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    const g = gesture.current;
    g.startX = clientX;
    g.startY = clientY;
    g.startTime = Date.now();
    g.currentX = 0;
    g.locked = false;
    g.axis = null;
    g.isDragging = true;
  }, [disabled]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const g = gesture.current;
    if (!g.isDragging) return;

    const dx = clientX - g.startX;
    const dy = clientY - g.startY;

    // Axis lock: determine once after 10px of movement
    if (!g.locked) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 10 && absDy < 10) return; // too small to determine
      // Use strong angle threshold: horizontal if angle < 35° from x-axis
      g.axis = absDx > absDy * 1.4 ? "h" : "v";
      g.locked = true;
      if (g.axis === "v") {
        // Vertical — don't interfere, let pager handle it
        g.isDragging = false;
        return;
      }
    }

    if (g.axis !== "h") return;

    g.currentX = clamp(dx);
    cancelAnimationFrame(g.rafId);
    g.rafId = requestAnimationFrame(() => {
      applyVisuals(g.currentX);
    });
  }, [applyVisuals]);

  const handleEnd = useCallback(() => {
    const g = gesture.current;
    if (!g.isDragging || g.axis !== "h") {
      g.isDragging = false;
      return;
    }
    g.isDragging = false;
    cancelAnimationFrame(g.rafId);

    const elapsed = Date.now() - g.startTime + 1;
    const velocity = Math.abs(g.currentX) / elapsed;
    const dx = g.currentX;

    const exceeded = Math.abs(dx) > THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (exceeded && Math.abs(dx) > 20) {
      const dir: DirectionKey = dx > 0 ? "right" : "left";
      const reaction = getReactionForDirection(dir);

      // Commit animation
      setCommitAnim({ dir, reaction });
      setTimeout(() => setCommitAnim(null), 600);
      onReact(dir);
      if (navigator.vibrate) navigator.vibrate(18);
    }

    resetVisuals(true);
  }, [onReact, getReactionForDirection, resetVisuals]);

  const currentReactionInfo = currentReaction ? getReactionForDirection(currentReaction) : null;
  const leftReaction = getReactionForDirection("left");
  const rightReaction = getReactionForDirection("right");

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Left reaction overlay (swipe left) */}
      <div
        ref={overlayLeftRef}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none"
        style={{ opacity: 0, transform: "scale(0.6)", transition: "none" }}
      >
        <span className="text-5xl drop-shadow-lg">{leftReaction.icon}</span>
        <span className="text-xs font-medium text-white/90 drop-shadow">{leftReaction.label}</span>
      </div>

      {/* Right reaction overlay (swipe right) */}
      <div
        ref={overlayRightRef}
        className="absolute left-8 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none"
        style={{ opacity: 0, transform: "scale(0.6)", transition: "none" }}
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

      {/* Swipeable content — touch events here, NOT on container (pager needs container) */}
      <div
        ref={contentRef}
        className="h-full w-full"
        style={{ willChange: "transform" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          handleStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handleMove(t.clientX, t.clientY);
        }}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => {
          handleStart(e.clientX, e.clientY);
          const onMouseMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY);
          const onMouseUp = () => {
            handleEnd();
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
      >
        {children}
      </div>
    </div>
  );
}
