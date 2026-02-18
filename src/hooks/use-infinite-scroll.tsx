import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}

export function useInfiniteScroll({ hasMore, loading, onLoadMore, rootMargin = "200px" }: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, rootMargin]);

  const Sentinel = useCallback(() => (
    hasMore ? (
      <div ref={sentinelRef} className="flex justify-center py-6">
        {loading && (
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        )}
      </div>
    ) : null
  ), [hasMore, loading]);

  return { Sentinel };
}
