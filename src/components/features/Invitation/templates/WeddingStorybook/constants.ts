/**
 * Page names used for screen reader announcements and dot navigation labels.
 * 6-page structure matching the component's spread layout.
 */
export const PAGE_NAMES = [
  "Cover",
  "Our Story",
  "Details",
  "Venue & Celebration",
  "RSVP & Thank You",
  "Forever & Always",
] as const;

/**
 * Total page count in the storybook.
 */
export const PAGE_COUNT = PAGE_NAMES.length;

/**
 * Roman numeral labels for the page counter display.
 */
export const ROMAN_NUMERALS = ["i", "ii", "iii", "iv", "v", "vi"] as const;

/**
 * Corner flourish SVG path data.
 * A stylised botanical / vine motif rendered at each page corner.
 */
export const FLOURISH_SVG_PATH =
  "M2 48 Q2 25 15 15 Q8 20 8 30 Q8 20 2 15 Q12 15 20 8 Q15 15 25 15 Q15 25 15 35 Q15 25 8 20 Q20 30 25 48 Q20 35 15 30 Q20 40 2 48Z";

/**
 * Particle burst configuration.
 */
export const PARTICLE_CONFIG = {
  /** Number of particles per burst */
  count: 24,
  /** Available particle shape types */
  types: [
    "petal",
    "sparkle",
    "sparkle",
    "star",
    "petal",
    "sparkle",
    "petal",
  ] as const,
  /** Burst duration in ms — synced with CSS --particle-duration */
  durationMs: 1500,
  /** Max random animation start delay */
  maxDelayMs: 200,
  /** Spread angle in degrees */
  spreadAngle: 120,
  /** Forward burst base angle (rightward / upward bias) */
  forwardBaseAngle: -60,
  /** Backward burst base angle (leftward / upward bias) */
  backwardBaseAngle: 120,
  /** Min distance from spine */
  minDistance: 80,
  /** Max additional random distance */
  distanceRange: 140,
  /** Vertical position spread from spine centre */
  spineSpread: 150,
  /** Min particle scale */
  minScale: 0.6,
  /** Additional random scale */
  scaleRange: 0.8,
  /** Max rotation (plus/minus degrees) */
  maxRotation: 540,
  /** Upward bias in px */
  upwardBias: 30,
} as const;

/**
 * Swipe gesture thresholds.
 */
export const SWIPE_CONFIG = {
  /** Minimum horizontal distance (px) to register a swipe */
  threshold: 50,
  /** Minimum distance before showing visual tilt feedback */
  feedbackThreshold: 15,
  /** Max tilt degrees during swipe feedback */
  maxTiltDeg: 3,
  /** Tilt multiplier (px to degrees) */
  tiltMultiplier: 0.02,
  /** Reset transition duration in ms */
  resetDurationMs: 400,
} as const;

/**
 * Default story content when not provided
 */
export const DEFAULT_STORY = {
  text: "What began as a chance encounter became a love story for the ages. Now, we invite you to witness the next chapter.",
  quote: "In all the world, there is no heart for me like yours.",
  quoteAttribution: "Maya Angelou",
} as const;

/**
 * Default schedule when not provided
 */
export const DEFAULT_SCHEDULE = [
  { time: "4:00 PM", activity: "Ceremony" },
  { time: "5:30 PM", activity: "Cocktails" },
  { time: "7:00 PM", activity: "Reception" },
] as const;

/**
 * Default celebration details when not provided
 */
export const DEFAULT_CELEBRATION = {
  ceremonyLocation: "Garden Pavilion",
  receptionLocation: "Grand Ballroom",
  attire: "Black Tie Optional",
} as const;

/**
 * Default thank you message
 */
export const DEFAULT_THANK_YOU_MESSAGE =
  "Whether near or far, you hold a special place in our hearts. We are so grateful for your love and support.";
