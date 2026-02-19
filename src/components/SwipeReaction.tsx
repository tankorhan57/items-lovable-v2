import { useRef, useState, useCallback, type ReactNode } from "react";
import { useReactionConfig, type DirectionKey, type AnimationPreset, REACTION_TYPES } from "@/hooks/use-reaction-config";

export type ReactionDirection = DirectionKey;

export { REACTION_TYPES as REACTION_MAP_LIST };

interface SwipeReactionProps {
  children: ReactNode;
  currentReaction: ReactionDirection | null;
  disabled?: boolean;
  onReact: (direction: ReactionDirection) => void;
  /** Use long-press mode (for feed) vs immediate drag (for detail) */
  longPressMode?: boolean;
}

const THRESHOLD = 55;
const MAX_DRAG = 130;
const LONG_PRESS_MS = 180;

function getDirection(dx: number, dy: number): DirectionKey | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < THRESHOLD && absDy < THRESHOLD) return null;
  if (absDx > absDy) return dx > 0 ? "right" : "left";
  return dy < 0 ? "up" : "down";
}

// Animation preset styles
function getPresetStyle(preset: AnimationPreset, progress: number, dir: DirectionKey) {
  const base = { opacity: Math.min(1, progress * 1.3), transition: "none" };
  switch (preset) {
    case "pop":
      return { ...base, transform: `scale(${0.4 + progress * 0.8})` };
    case "slide": {
      const dx = dir === "left" ? -30 * (1 - progress) : dir === "right" ? 30 * (1 - progress) : 0;
      const dy = dir === "up" ? -30 * (1 - progress) : dir === "down" ? 30 * (1 - progress) : 0;
      return { ...base, transform: `translate(${dx}px, ${dy}px) scale(${0.7 + progress * 0.3})` };
    }
    case "stamp":
      return { ...base, transform: `scale(${progress > 0.8 ? 1 : 0.2 + progress * 1.2})` };
    case "ripple":
      return { ...base, transform: `scale(${0.5 + progress * 0.6})`, filter: `blur(${(1 - progress) * 3}px)` };
    case "glow":
      return { ...base, transform: `scale(${0.8 + progress * 0.25})`, filter: `brightness(${1 + progress * 0.4})` };
    default:
      return { ...base, transform: `scale(${0.5 + progress * 0.5})` };
  }
}

export default function SwipeReaction({
  children,
  currentReaction,
  disabled,
  onReact,
  longPressMode = false,
}: SwipeReactionProps) {
  const { getReactionForDirection, getAnimationForDirection } = useReactionConfig();
  const [dragging, setDragging] = useState(false);
  const [activated, setActivated] = useState(false); // long-press activated
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [commitAnim, setCommitAnim] = useState<{ dir: DirectionKey; reaction: typeof REACTION_TYPES[number] } | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const isTrackingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const clamp = (v: number) => Math.max(-MAX_DRAG, Math.min(MAX_DRAG, v));

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      startRef.current = { x: clientX, y: clientY };

      if (longPressMode) {
        longPressTimerRef.current = setTimeout(() => {
          setActivated(true);
          setDragging(true);
          isTrackingRef.current = true;
          if (navigator.vibrate) navigator.vibrate(10);
        }, LONG_PRESS_MS);
      } else {
        isTrackingRef.current = true;
        setDragging(true);
      }
    },
    [disabled, longPressMode]
  );

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (longPressMode && !activated && !isTrackingRef.current) {
      // Check if moved too much before long-press, cancel
      const dx = Math.abs(clientX - startRef.current.x);
      const dy = Math.abs(clientY - startRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimerRef.current);
      }
      return;
    }
    if (!isTrackingRef.current) return;
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    setOffset({ x: clamp(dx), y: clamp(dy) });
  }, [longPressMode, activated]);

  const handleEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);

    if (!isTrackingRef.current) {
      setActivated(false);
      return;
    }
    isTrackingRef.current = false;
    const dir = getDirection(offset.x, offset.y);

    if (dir) {
      const reaction = getReactionForDirection(dir);
      // Commit animation
      setCommitAnim({ dir, reaction });
      setTimeout(() => setCommitAnim(null), 600);
      onReact(dir);
      if (navigator.vibrate) navigator.vibrate(20);
    }

    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setActivated(false);
  }, [offset, onReact, getReactionForDirection]);

  const direction = getDirection(offset.x, offset.y);
  const progress = Math.min(
    1,
    Math.max(Math.abs(offset.x), Math.abs(offset.y)) / THRESHOLD
  );

  const currentReactionInfo = currentReaction ? getReactionForDirection(currentReaction) : null;

  return (
    <div className="relative overflow-hidden rounded-xl touch-none select-none">
      {/* Drag overlay */}
      {dragging && direction && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ opacity: Math.min(0.5, progress * 0.6), transition: "opacity 80ms ease" }}
          />
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            {(() => {
              const reaction = getReactionForDirection(direction);
              const preset = getAnimationForDirection(direction);
              const style = getPresetStyle(preset, progress, direction);
              return (
                <div style={style}>
                  <span className="text-5xl drop-shadow-lg block">{reaction.icon}</span>
                  <span className="text-xs font-medium text-white/90 drop-shadow block text-center mt-1">
                    {reaction.label}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
      {currentReactionInfo && !dragging && !commitAnim && (
        <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 animate-scale-in">
          <span className="text-sm">{currentReactionInfo.icon}</span>
          <span className="text-[10px] text-white/80">{currentReactionInfo.label}</span>
        </div>
      )}

      {/* Long-press indicator */}
      {longPressMode && activated && !direction && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-black/30 absolute inset-0" />
          <p className="relative text-xs text-white/70 font-medium">Drag to react</p>
        </div>
      )}

      {/* Swipeable content */}
      <div
        style={{
          transform: dragging
            ? `translate(${offset.x * 0.25}px, ${offset.y * 0.25}px) scale(${1 - progress * 0.03})`
            : commitAnim
              ? "scale(0.97)"
              : "translate(0,0) scale(1)",
          transition: dragging
            ? "none"
            : "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
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
