import { useRef, useCallback, useEffect, useState, useLayoutEffect, type ReactNode } from "react";
import { FEED_ANIM_CONFIG, getTransitionCSS } from "@/lib/feed-anim-config";

export interface FeedItem {
  id: string;
  image_url?: string;
  [key: string]: any;
}

interface PhotoFeedPagerProps<T extends FeedItem> {
  items: T[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onEndReached: () => void;
  renderItem: (item: T, index: number, isActive: boolean) => ReactNode;
  renderOverlay?: (item: T, index: number) => ReactNode;
  /** If true, uses container height instead of 100dvh */
  useContainerHeight?: boolean;
}

/**
 * High-performance vertical pager.
 * All gesture state lives in refs – zero React re-renders during drag.
 * Transforms are applied directly to the DOM via rAF for 60fps.
 */
export default function PhotoFeedPager<T extends FeedItem>({
  items,
  currentIndex,
  onIndexChange,
  onEndReached,
  renderItem,
  renderOverlay,
  useContainerHeight = false,
}: PhotoFeedPagerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // All mutable gesture state in a single ref to avoid re-renders
  const gesture = useRef({
    startY: 0,
    startX: 0,
    startTime: 0,
    currentY: 0,
    isDragging: false,
    isLocked: false,
    axisLocked: false,
    axis: null as "v" | "h" | null,
    pageHeight: 0,
    rafId: 0,
  });

  const config = FEED_ANIM_CONFIG;

  // Measure page height
  const getPageHeight = useCallback(() => {
    if (useContainerHeight && containerRef.current) {
      return containerRef.current.clientHeight;
    }
    return window.innerHeight;
  }, [useContainerHeight]);

  // Apply transform directly to DOM – no setState
  const applyTransform = useCallback((offset: number, transition: string = "none") => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = transition;
    track.style.transform = `translateY(${offset}px)`;
  }, []);

  // Snap to a page index with animation
  const snapToPage = useCallback((index: number, velocity: number = 0) => {
    const g = gesture.current;
    g.isLocked = true;
    const h = getPageHeight();
    const target = -index * h;
    const css = getTransitionCSS(velocity);
    applyTransform(target, css);

    // Parse duration from CSS string
    const dur = parseInt(css.match(/(\d+)ms/)?.[1] || "280");
    setTimeout(() => {
      g.isLocked = false;
    }, dur);

    onIndexChange(index);
  }, [getPageHeight, applyTransform, onIndexChange]);

  // Prefetch images
  useEffect(() => {
    for (let i = currentIndex + 1; i <= Math.min(currentIndex + config.prefetchAhead, items.length - 1); i++) {
      if (items[i]?.image_url) {
        const img = new Image();
        img.src = items[i].image_url!;
      }
    }
    if (currentIndex >= items.length - 2) {
      onEndReached();
    }
  }, [currentIndex, items.length]);

  // Set initial position when currentIndex changes externally
  useEffect(() => {
    const h = getPageHeight();
    if (h > 0) {
      applyTransform(-currentIndex * h, "none");
    }
  }, [currentIndex, getPageHeight, applyTransform]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => {
      const h = getPageHeight();
      gesture.current.pageHeight = h;
      applyTransform(-currentIndex * h, "none");
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [currentIndex, getPageHeight, applyTransform]);

  // ─── Touch handlers ───
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const g = gesture.current;
    if (g.isLocked) return;
    g.startY = e.touches[0].clientY;
    g.startX = e.touches[0].clientX;
    g.currentY = 0;
    g.startTime = Date.now();
    g.isDragging = true;
    g.axisLocked = false;
    g.axis = null;
    g.pageHeight = getPageHeight();

    // Kill any ongoing transition
    const track = trackRef.current;
    if (track) {
      const matrix = getComputedStyle(track).transform;
      if (matrix && matrix !== "none") {
        const values = matrix.match(/matrix.*\((.+)\)/);
        if (values) {
          const parts = values[1].split(",").map(Number);
          const currentTranslateY = parts[5] || 0;
          track.style.transition = "none";
          track.style.transform = `translateY(${currentTranslateY}px)`;
        }
      }
    }
  }, [getPageHeight]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g.isDragging || g.isLocked) return;

    const dx = e.touches[0].clientX - g.startX;
    const dy = e.touches[0].clientY - g.startY;

    // Axis lock: determine once after 10px of movement
    if (!g.axisLocked) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 10 && absDy < 10) return;
      g.axis = absDy >= absDx * 0.7 ? "v" : "h";
      g.axisLocked = true;
      if (g.axis === "h") {
        // Horizontal — abort pager drag, let HorizontalReaction handle it
        g.isDragging = false;
        return;
      }
    }

    if (g.axis !== "v") return;

    // Apply resistance
    let resistance = config.dragResistance;
    if ((currentIndex === 0 && dy > 0) || (currentIndex >= items.length - 1 && dy < 0)) {
      resistance = config.overscrollResistance;
    }

    g.currentY = dy * resistance;
    const base = -currentIndex * g.pageHeight;

    // Direct DOM manipulation via rAF for smooth 60fps
    cancelAnimationFrame(g.rafId);
    g.rafId = requestAnimationFrame(() => {
      applyTransform(base + g.currentY, "none");
    });
  }, [currentIndex, items.length, config.dragResistance, config.overscrollResistance, applyTransform]);

  const onTouchEnd = useCallback(() => {
    const g = gesture.current;
    if (!g.isDragging) return;
    g.isDragging = false;
    cancelAnimationFrame(g.rafId);

    const elapsed = Date.now() - g.startTime + 1;
    const velocity = g.currentY / elapsed; // px/ms
    const offset = g.currentY;

    if (offset < -config.snapThreshold || velocity < -config.velocityThreshold) {
      // Swipe up → next
      if (currentIndex < items.length) {
        snapToPage(Math.min(currentIndex + 1, items.length), velocity);
      } else {
        snapToPage(currentIndex, velocity);
      }
    } else if (offset > config.snapThreshold || velocity > config.velocityThreshold) {
      // Swipe down → previous
      if (currentIndex > 0) {
        snapToPage(currentIndex - 1, velocity);
      } else {
        snapToPage(0, velocity);
      }
    } else {
      // Snap back
      snapToPage(currentIndex, 0);
    }
  }, [currentIndex, items.length, config.snapThreshold, config.velocityThreshold, snapToPage]);

  // ─── Mouse support (desktop testing) ───
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const g = gesture.current;
    if (g.isLocked) return;
    g.startY = e.clientY;
    g.startX = e.clientX;
    g.currentY = 0;
    g.startTime = Date.now();
    g.isDragging = true;
    g.axisLocked = false;
    g.axis = null;
    g.pageHeight = getPageHeight();

    const onMove = (ev: MouseEvent) => {
      if (!g.isDragging) return;
      const dx = ev.clientX - g.startX;
      const dy = ev.clientY - g.startY;

      if (!g.axisLocked) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < 10 && absDy < 10) return;
        g.axis = absDy >= absDx * 0.7 ? "v" : "h";
        g.axisLocked = true;
        if (g.axis === "h") {
          g.isDragging = false;
          return;
        }
      }

      if (g.axis !== "v") return;
      let resistance = config.dragResistance;
      if ((currentIndex === 0 && dy > 0) || (currentIndex >= items.length - 1 && dy < 0)) {
        resistance = config.overscrollResistance;
      }
      g.currentY = dy * resistance;
      const base = -currentIndex * g.pageHeight;
      cancelAnimationFrame(g.rafId);
      g.rafId = requestAnimationFrame(() => {
        applyTransform(base + g.currentY, "none");
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Reuse touch end logic
      g.isDragging = false;
      cancelAnimationFrame(g.rafId);
      const elapsed = Date.now() - g.startTime + 1;
      const velocity = g.currentY / elapsed;
      const offset = g.currentY;

      if (offset < -config.snapThreshold || velocity < -config.velocityThreshold) {
        if (currentIndex < items.length) {
          snapToPage(Math.min(currentIndex + 1, items.length), velocity);
        } else {
          snapToPage(currentIndex, velocity);
        }
      } else if (offset > config.snapThreshold || velocity > config.velocityThreshold) {
        if (currentIndex > 0) snapToPage(currentIndex - 1, velocity);
        else snapToPage(0, velocity);
      } else {
        snapToPage(currentIndex, 0);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [currentIndex, items.length, config, getPageHeight, applyTransform, snapToPage]);

  // Windowed rendering
  const half = Math.floor(config.maxRenderedItems / 2);
  const windowStart = Math.max(0, currentIndex - half);
  const windowEnd = Math.min(items.length - 1, currentIndex + half);

  // Use measured container height for page sizing when useContainerHeight is true
  const [measuredHeight, setMeasuredHeight] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (useContainerHeight && containerRef.current) {
        setMeasuredHeight(containerRef.current.clientHeight);
      } else {
        setMeasuredHeight(window.innerHeight);
      }
    };
    measure();
    // Also observe resize
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [useContainerHeight]);

  const pageHeightStyle = measuredHeight > 0
    ? { height: `${measuredHeight}px` }
    : { height: "100dvh" };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div
        ref={trackRef}
        style={{ willChange: "transform" }}
      >
        {items.map((item, idx) => {
          const isInWindow = idx >= windowStart && idx <= windowEnd;
          const isActive = idx === currentIndex;

          return (
            <div
              key={item.id}
              className="w-full relative"
              style={{ ...pageHeightStyle, contain: "layout style paint" }}
            >
              {isInWindow ? (
                <>
                  {renderItem(item, idx, isActive)}
                  {renderOverlay && isActive && renderOverlay(item, idx)}
                </>
              ) : (
                <div className="h-full w-full bg-black" />
              )}
            </div>
          );
        })}
        {/* End-of-feed sentinel page */}
        <div
          key="end-sentinel"
          className="w-full"
          style={{ ...pageHeightStyle, contain: "layout style paint" }}
        />
      </div>
    </div>
  );
}
