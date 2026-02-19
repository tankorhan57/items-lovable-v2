/**
 * Feed Animation Configuration
 * 
 * Central control panel for all Following feed animation behavior.
 * Modify these values to tune the feel without touching component code.
 */

export type TransitionStyle = "smooth-settle" | "soft-snap" | "gentle-spring";

export interface FeedAnimConfig {
  /** Transition style preset */
  transitionStyle: TransitionStyle;

  /** Duration range in ms — actual duration interpolated by drag velocity */
  durationMin: number;
  durationMax: number;

  /** CSS easing function per style */
  easing: string;

  /** Minimum drag distance (px) to trigger page change */
  snapThreshold: number;

  /** Minimum velocity (px/ms) to trigger page change regardless of distance */
  velocityThreshold: number;

  /** Drag resistance factor (0-1, lower = more resistance) */
  dragResistance: number;

  /** Number of items to prefetch ahead */
  prefetchAhead: number;

  /** Max items to keep rendered in DOM (for memory management) */
  maxRenderedItems: number;

  /** Whether to show skeleton placeholders */
  showPlaceholders: boolean;

  /** Placeholder fade-in duration ms */
  placeholderFadeDuration: number;

  /** Overscroll resistance at feed boundaries (0-1) */
  overscrollResistance: number;
}

const EASING_MAP: Record<TransitionStyle, string> = {
  "smooth-settle": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  "soft-snap": "cubic-bezier(0.22, 1, 0.36, 1)",
  "gentle-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/**
 * Active configuration — edit these values to change feed behavior globally.
 */
export const FEED_ANIM_CONFIG: FeedAnimConfig = {
  transitionStyle: "soft-snap",
  durationMin: 200,
  durationMax: 320,
  easing: EASING_MAP["soft-snap"],
  snapThreshold: 50,
  velocityThreshold: 0.35,
  dragResistance: 0.45,
  prefetchAhead: 3,
  maxRenderedItems: 7,
  showPlaceholders: true,
  placeholderFadeDuration: 150,
  overscrollResistance: 0.2,
};

/** Get transition duration based on drag velocity */
export function getTransitionDuration(velocity: number): number {
  const { durationMin, durationMax } = FEED_ANIM_CONFIG;
  const absV = Math.abs(velocity);
  // Faster swipe = shorter duration
  const t = Math.min(1, absV / 2);
  return Math.round(durationMax - t * (durationMax - durationMin));
}

/** Get the CSS transition string for the current config */
export function getTransitionCSS(velocity: number = 0): string {
  const duration = getTransitionDuration(velocity);
  return `transform ${duration}ms ${FEED_ANIM_CONFIG.easing}`;
}

/** Apply a different preset at runtime */
export function setTransitionStyle(style: TransitionStyle) {
  FEED_ANIM_CONFIG.transitionStyle = style;
  FEED_ANIM_CONFIG.easing = EASING_MAP[style];
}
