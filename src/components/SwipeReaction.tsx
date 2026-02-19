import { useRef, useState, useCallback, type ReactNode } from "react";

export type ReactionDirection = "up" | "down" | "left" | "right";

interface ReactionConfig {
  label: string;
  icon: string;
}

export const REACTION_MAP: Record<ReactionDirection, ReactionConfig> = {
  right: { label: "Love", icon: "❤️" },
  left: { label: "Hmm", icon: "🤔" },
  up: { label: "Fire", icon: "🔥" },
  down: { label: "Calm", icon: "🌊" },
};

interface SwipeReactionProps {
  children: ReactNode;
  currentReaction: ReactionDirection | null;
  disabled?: boolean;
  onReact: (direction: ReactionDirection) => void;
}

const THRESHOLD = 60;
const MAX_DRAG = 120;

function getDirection(dx: number, dy: number): ReactionDirection | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < THRESHOLD && absDy < THRESHOLD) return null;
  if (absDx > absDy) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export default function SwipeReaction({
  children,
  currentReaction,
  disabled,
  onReact,
}: SwipeReactionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0, time: 0 });
  const isTrackingRef = useRef(false);

  const clamp = (v: number) => Math.max(-MAX_DRAG, Math.min(MAX_DRAG, v));

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      startRef.current = { x: clientX, y: clientY, time: Date.now() };
      isTrackingRef.current = true;
      setDragging(true);
    },
    [disabled]
  );

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isTrackingRef.current) return;
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    setOffset({ x: clamp(dx), y: clamp(dy) });
  }, []);

  const handleEnd = useCallback(() => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;
    const dir = getDirection(offset.x, offset.y);
    if (dir) {
      onReact(dir);
      // haptic feedback
      if (navigator.vibrate) navigator.vibrate(15);
    }
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  }, [offset, onReact]);

  const direction = getDirection(offset.x, offset.y);
  const progress = Math.min(
    1,
    Math.max(Math.abs(offset.x), Math.abs(offset.y)) / THRESHOLD
  );

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl touch-none select-none">
      {/* Directional overlays */}
      {dragging && direction && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-100"
          style={{ opacity: Math.min(1, progress * 1.2) }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <span className="text-4xl drop-shadow-lg" style={{ transform: `scale(${0.8 + progress * 0.4})` }}>
              {REACTION_MAP[direction].icon}
            </span>
            <span className="text-xs font-medium text-white/90 drop-shadow">
              {REACTION_MAP[direction].label}
            </span>
          </div>
        </div>
      )}

      {/* Current reaction badge */}
      {currentReaction && !dragging && (
        <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="text-sm">{REACTION_MAP[currentReaction].icon}</span>
          <span className="text-[10px] text-white/80">{REACTION_MAP[currentReaction].label}</span>
        </div>
      )}

      {/* Swipeable content */}
      <div
        style={{
          transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.3}px)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
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
