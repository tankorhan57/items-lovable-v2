import { useRef, useCallback, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
    }
  }, [pulling, refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold * 0.5);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  const PullIndicator = () => (
    pullDistance > 0 || refreshing ? (
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: refreshing ? 40 : pullDistance > 0 ? pullDistance : 0 }}
      >
        <div
          className={`h-5 w-5 rounded-full border-2 border-primary border-t-transparent ${refreshing ? "animate-spin" : ""}`}
          style={{
            opacity: refreshing ? 1 : Math.min(pullDistance / threshold, 1),
            transform: `rotate(${(pullDistance / threshold) * 360}deg)`,
          }}
        />
      </div>
    ) : null
  );

  return {
    containerRef,
    pullHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    PullIndicator,
    refreshing,
  };
}
