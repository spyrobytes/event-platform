/**
 * Chapter System
 *
 * Provides logical grouping of sections into chapters for a multi-page feel.
 * Chapters are inferred from section types with smart defaults.
 */

export { ChapterBreak, ChapterLabel } from "./ChapterBreak";
export {
  // Types
  type Chapter,
  type ChapteredSection,
  type ChapterGroup,
  // Chapter definitions
  WEDDING_CHAPTERS,
  CONFERENCE_CHAPTERS,
  PARTY_CHAPTERS,
  // Functions
  getChaptersForEventType,
  findChapterForSection,
  assignChaptersToSections,
  groupSectionsByChapter,
  shouldShowChapterBreak,
  getChapterProgress,
} from "./chapters";
