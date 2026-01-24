/**
 * Temporal Context
 *
 * Provides time-aware state to template components,
 * enabling pages to adapt based on event timing.
 */

export {
  TemporalProvider,
  useTemporal,
  useHasTemporal,
} from "./TemporalContext";

export {
  getTemporalMessage,
  getAllTemporalMessages,
  getPersonalizedMessage,
  getTemporalCTA,
  type MessageCategory,
  type EventType,
} from "./temporal-messages";
