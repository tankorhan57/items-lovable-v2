import { useRef, useCallback, useState, useEffect, type ReactNode } from "react";
import { useReactionConfig, type DirectionKey, REACTION_TYPES } from "@/hooks/use-reaction-config";

export interface CardItem {
  id: string;
  image_url?: string;
  [key: string]: any;
}

interface CardStackProps<T extends CardItem> {
  items: T[];
  onSwipe: (item: T, direction: DirectionKey) => void;
  onEmpty: () => void;
  renderCard: (item: T, index: number) => ReactNode;
  /** Number of cards visible in the stack behind the top card */
  stackDepth?: number;
}

const THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.4;
const MAX_DRAG = 260;
const ROTATION_FACTOR = 0.12;
const FLY_DURATION = 340;
const SPRING_DURATION = 400;

/**
 * Tinder-style card stack with swipe-to-react.
 * Left swipe = left reaction, right swipe = right reaction.
 * Cards fly off on commit, spring back otherwise.
 */
export default function CardStack<T extends CardItem>({
  items,
  onSwipe,
  onEmpty,
  renderCard,
  stackDepth = 2,
}: CardStackProps<T>) {
  const { getReactionForDirection } = useReactionConfig();

  // Track which cards have been dismissed (by index into original items array)
  const [dismissedCount, setDismissedCount] = useState(0);
  const [flyingOff, setFlyingOff] = useState<{ dir: "left" | "right" } | null>(null);
  const [commitAnim, setCommitAnim] = useState<{ icon: string; label: string } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const overlayLeftRef = useRef<HTMLDivElement>(null);
  const overlayRightRef = useRef<HTMLDivElement>(null);

  const gesture = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    dx: 0,
    isDragging: false,
    isLocked: false,
    axis: null as "h" | "v" | null,
    rafId: 0,
  });

  const remaining = items.slice(dismissedCount);

  // Notify parent when empty
  useEffect(() => {
    if (remaining.length === 0 && dismissedCount > 0) {
      onEmpty();
    }
  }, [remaining.length, dismissedCount, onEmpty]);

  const clamp = (v: number) => Math.max(-MAX_DRAG, Math.min(MAX_DRAG, v));

  const applyTransform = useCallback((dx: number, transition = "none") => {
    const el = cardRef.current;
    if (!el) return;
    const clamped = clamp(dx);
    const rotation = clamped * ROTATION_FACTOR;
    el.style.transition = transition;
    el.style.transform = `translateX(${clamped}px) rotate(${rotation}deg)`;

    // Overlays
    const progress = Math.min(1, Math.abs(clamped) / THRESHOLD);
    if (overlayLeftRef.current) {
      overlayLeftRef.current.style.opacity = clamped < -20 ? String(Math.min(1, progress * 1.5)) : "0";
      overlayLeftRef.current.style.transform = `scale(${0.4 + progress * 0.6})`;
    }
    if (overlayRightRef.current) {
      overlayRightRef.current.style.opacity = clamped > 20 ? String(Math.min(1, progress * 1.5)) : "0";
      overlayRightRef.current.style.transform = `scale(${0.4 + progress * 0.6})`;
    }
  }, []);

  const resetCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = `transform ${SPRING_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    el.style.transform = "translateX(0) rotate(0deg)";
    if (overlayLeftRef.current) { overlayLeftRef.current.style.opacity = "0"; overlayLeftRef.current.style.transform = "scale(0.4)"; }
    if (overlayRightRef.current) { overlayRightRef.current.style.opacity = "0"; overlayRightRef.current.style.transform = "scale(0.4)"; }
  }, []);

  const dismissCard = useCallback((dir: DirectionKey) => {
    const g = gesture.current;
    g.isLocked = true;

    const item = remaining[0];
    if (!item) return;

    const reaction = getReactionForDirection(dir);
    setCommitAnim({ icon: reaction.icon, label: reaction.label });

    // Fly off
    const flyX = dir === "right" ? window.innerWidth + 100 : -window.innerWidth - 100;
    const rotation = flyX * ROTATION_FACTOR * 0.5;
    const el = cardRef.current;
    if (el) {
      el.style.transition = `transform ${FLY_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      el.style.transform = `translateX(${flyX}px) rotate(${rotation}deg)`;
    }

    if (navigator.vibrate) navigator.vibrate(18);
    onSwipe(item, dir);

    setTimeout(() => {
      setDismissedCount(c => c + 1);
      setFlyingOff(null);
      setCommitAnim(null);
      g.isLocked = false;

      // Reset card position for next card
      if (el) {
        el.style.transition = "none";
        el.style.transform = "translateX(0) rotate(0deg)";
      }
      if (overlayLeftRef.current) { overlayLeftRef.current.style.opacity = "0"; }
      if (overlayRightRef.current) { overlayRightRef.current.style.opacity = "0"; }
    }, FLY_DURATION);
  }, [remaining, getReactionForDirection, onSwipe]);

  // ─── Touch handlers ───
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const g = gesture.current;
    if (g.isLocked) return;
    const t = e.touches[0];
    g.startX = t.clientX;
    g.startY = t.clientY;
    g.dx = 0;
    g.startTime = Date.now();
    g.isDragging = true;
    g.axis = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g.isDragging || g.isLocked) return;

    const t = e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;

    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (g.axis === "v") { g.isDragging = false; return; }
    }
    if (g.axis !== "h") return;

    e.preventDefault();
    g.dx = dx;
    cancelAnimationFrame(g.rafId);
    g.rafId = requestAnimationFrame(() => applyTransform(dx));
  }, [applyTransform]);

  const onTouchEnd = useCallback(() => {
    const g = gesture.current;
    if (!g.isDragging) return;
    g.isDragging = false;
    cancelAnimationFrame(g.rafId);

    if (g.axis !== "h") return;

    const elapsed = Date.now() - g.startTime + 1;
    const velocity = Math.abs(g.dx) / elapsed;
    const exceeded = Math.abs(g.dx) > THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (exceeded && Math.abs(g.dx) > 30) {
      const dir: DirectionKey = g.dx > 0 ? "right" : "left";
      dismissCard(dir);
    } else {
      resetCard();
    }
    g.axis = null;
  }, [dismissCard, resetCard]);

  // ─── Mouse handlers ───
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const g = gesture.current;
    if (g.isLocked) return;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.dx = 0;
    g.startTime = Date.now();
    g.isDragging = true;
    g.axis = null;

    const onMove = (ev: MouseEvent) => {
      if (!g.isDragging) return;
      const dx = ev.clientX - g.startX;
      const dy = ev.clientY - g.startY;
      if (!g.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (g.axis === "v") { g.isDragging = false; return; }
      }
      if (g.axis !== "h") return;
      g.dx = dx;
      cancelAnimationFrame(g.rafId);
      g.rafId = requestAnimationFrame(() => applyTransform(dx));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      g.isDragging = false;
      cancelAnimationFrame(g.rafId);
      if (g.axis !== "h") return;

      const elapsed = Date.now() - g.startTime + 1;
      const velocity = Math.abs(g.dx) / elapsed;
      const exceeded = Math.abs(g.dx) > THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (exceeded && Math.abs(g.dx) > 30) {
        const dir: DirectionKey = g.dx > 0 ? "right" : "left";
        dismissCard(dir);
      } else {
        resetCard();
      }
      g.axis = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [applyTransform, dismissCard, resetCard]);

  const leftReaction = getReactionForDirection("left");
  const rightReaction = getReactionForDirection("right");

  if (remaining.length === 0) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background cards (stack effect) */}
      {remaining.slice(1, 1 + stackDepth).map((item, i) => {
        const stackIdx = i + 1;
        const scale = 1 - stackIdx * 0.04;
        const translateY = stackIdx * 8;
        return (
          <div
            key={item.id}
            className="absolute inset-x-0 mx-auto w-[calc(100%-16px)] max-w-[420px] pointer-events-none"
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              zIndex: 10 - stackIdx,
              opacity: Math.max(0.4, 1 - stackIdx * 0.25),
              transition: "transform 300ms ease, opacity 300ms ease",
            }}
          >
            <div className="rounded-2xl overflow-hidden shadow-lg bg-card" style={{ aspectRatio: "3/4" }}>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Top card — draggable */}
      <div
        ref={cardRef}
        className="relative w-[calc(100%-16px)] max-w-[420px] z-20 touch-none select-none"
        style={{ willChange: "transform" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Left overlay (swipe left → 🤔) */}
        <div
          ref={overlayLeftRef}
          className="absolute right-6 top-8 z-30 flex flex-col items-center gap-1 pointer-events-none"
          style={{ opacity: 0, transform: "scale(0.4)" }}
        >
          <span className="text-6xl drop-shadow-lg">{leftReaction.icon}</span>
          <span className="text-sm font-semibold text-white drop-shadow-lg">{leftReaction.label}</span>
        </div>

        {/* Right overlay (swipe right → ❤️) */}
        <div
          ref={overlayRightRef}
          className="absolute left-6 top-8 z-30 flex flex-col items-center gap-1 pointer-events-none"
          style={{ opacity: 0, transform: "scale(0.4)" }}
        >
          <span className="text-6xl drop-shadow-lg">{rightReaction.icon}</span>
          <span className="text-sm font-semibold text-white drop-shadow-lg">{rightReaction.label}</span>
        </div>

        {/* Commit animation */}
        {commitAnim && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-reaction-commit">
            <div className="flex flex-col items-center gap-1">
              <span className="text-7xl drop-shadow-lg">{commitAnim.icon}</span>
              <span className="text-sm font-bold text-white drop-shadow-lg">{commitAnim.label}</span>
            </div>
          </div>
        )}

        {/* Card content */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "3/4" }}>
          {renderCard(remaining[0], dismissedCount)}
        </div>
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground tabular-nums">
          {dismissedCount + 1} of {items.length}
        </span>
      </div>
    </div>
  );
}
