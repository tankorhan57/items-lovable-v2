import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
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
  /** If true, uses container height instead of 100vh */
  useContainerHeight?: boolean;
}

export default function PhotoFeedPager<T extends FeedItem>({
  items,
  currentIndex,
  onIndexChange,
  onEndReached,
  renderItem,
  renderOverlay,
  useContainerHeight = false,
}: PhotoFeedPagerProps<T>) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [transitionCSS, setTransitionCSS] = useState("");
  const [containerHeight, setContainerHeight] = useState(0);
  const touchRef = useRef({ y: 0, time: 0 });
  const isLockedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container
  useEffect(() => {
    if (useContainerHeight && containerRef.current) {
      const measure = () => setContainerHeight(containerRef.current?.clientHeight || 0);
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [useContainerHeight]);

  const config = FEED_ANIM_CONFIG;

  // Prefetch images
  useEffect(() => {
    for (let i = currentIndex + 1; i <= Math.min(currentIndex + config.prefetchAhead, items.length - 1); i++) {
      if (items[i]?.image_url) {
        const img = new Image();
        img.src = items[i].image_url;
      }
    }
    // Check if near end
    if (currentIndex >= items.length - 2) {
      onEndReached();
    }
  }, [currentIndex, items.length]);

  const goTo = useCallback((index: number, velocity: number = 0) => {
    const clamped = Math.max(0, Math.min(items.length, index)); // allow items.length for end-of-feed
    isLockedRef.current = true;
    const css = getTransitionCSS(velocity);
    setTransitionCSS(css);
    setDragOffset(0);
    onIndexChange(clamped);
    const duration = parseInt(css.match(/(\d+)ms/)?.[1] || "280");
    setTimeout(() => { isLockedRef.current = false; }, duration);
  }, [items.length, onIndexChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isLockedRef.current) return;
    touchRef.current = { y: e.touches[0].clientY, time: Date.now() };
    setIsDragging(true);
    setTransitionCSS("");
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || isLockedRef.current) return;
    const dy = e.touches[0].clientY - touchRef.current.y;

    // Apply resistance
    let resistance = config.dragResistance;
    // Extra resistance at boundaries
    if ((currentIndex === 0 && dy > 0) || (currentIndex >= items.length - 1 && dy < 0)) {
      resistance = config.overscrollResistance;
    }
    setDragOffset(dy * resistance);
  }, [isDragging, currentIndex, items.length, config]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Date.now() - touchRef.current.time + 1;
    const velocity = dragOffset / elapsed; // px/ms

    if (dragOffset < -config.snapThreshold || velocity < -config.velocityThreshold) {
      // Next
      if (currentIndex < items.length) {
        goTo(currentIndex + 1, velocity);
      } else {
        goTo(currentIndex, velocity);
      }
    } else if (dragOffset > config.snapThreshold || velocity > config.velocityThreshold) {
      // Previous
      if (currentIndex > 0) {
        goTo(currentIndex - 1, velocity);
      } else {
        goTo(currentIndex, velocity);
      }
    } else {
      // Snap back
      goTo(currentIndex, 0);
    }
  }, [isDragging, dragOffset, currentIndex, items.length, goTo, config]);

  // Mouse support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLockedRef.current) return;
    touchRef.current = { y: e.clientY, time: Date.now() };
    setIsDragging(true);
    setTransitionCSS("");

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - touchRef.current.y;
      let resistance = config.dragResistance;
      if ((currentIndex === 0 && dy > 0) || (currentIndex >= items.length - 1 && dy < 0)) {
        resistance = config.overscrollResistance;
      }
      setDragOffset(dy * resistance);
    };
    const onUp = () => {
      // Trigger same logic as touch end — we'll read from a ref
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [currentIndex, items.length, config]);

  // Handle mouse end via effect when isDragging changes to false
  useEffect(() => {
    if (!isDragging && dragOffset !== 0) {
      const elapsed = Date.now() - touchRef.current.time + 1;
      const velocity = dragOffset / elapsed;

      if (dragOffset < -config.snapThreshold || velocity < -config.velocityThreshold) {
        if (currentIndex < items.length) goTo(currentIndex + 1, velocity);
        else goTo(currentIndex, velocity);
      } else if (dragOffset > config.snapThreshold || velocity > config.velocityThreshold) {
        if (currentIndex > 0) goTo(currentIndex - 1, velocity);
        else goTo(currentIndex, velocity);
      } else {
        goTo(currentIndex, 0);
      }
    }
  }, [isDragging]);

  // Determine which items to render (windowed)
  const half = Math.floor(config.maxRenderedItems / 2);
  const windowStart = Math.max(0, currentIndex - half);
  const windowEnd = Math.min(items.length - 1, currentIndex + half);

  const useCH = useContainerHeight && containerHeight > 0;
  const pageUnit = useCH ? `${containerHeight}px` : "100vh";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          transform: useCH
            ? `translateY(${-currentIndex * containerHeight + dragOffset}px)`
            : `translateY(calc(${-currentIndex} * 100vh + ${dragOffset}px))`,
          transition: isDragging ? "none" : transitionCSS || getTransitionCSS(),
          willChange: "transform",
        }}
      >
        {items.map((item, idx) => {
          const isInWindow = idx >= windowStart && idx <= windowEnd;
          const isActive = idx === currentIndex;

          return (
            <div
              key={item.id}
              className="w-full relative"
              style={{ height: pageUnit, contain: "layout style paint" }}
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
          style={{ height: pageUnit, contain: "layout style paint" }}
        />
      </div>
    </div>
  );
}
