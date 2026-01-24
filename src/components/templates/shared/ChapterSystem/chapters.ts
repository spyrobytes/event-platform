/**
 * Chapter System - Inferred Chapter Groupings
 *
 * Groups sections into logical chapters for a multi-page feel.
 * Chapters are inferred from section types with smart defaults,
 * following the "crafted over configurable" philosophy.
 */

/**
 * Chapter definition
 */
export type Chapter = {
  id: string;
  /** Display name for the chapter */
  name: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Section types that belong to this chapter */
  sectionTypes: string[];
  /** Visual style for chapter break */
  style?: "minimal" | "decorative" | "dramatic";
};

/**
 * Section with chapter assignment
 */
export type ChapteredSection = {
  type: string;
  enabled: boolean;
  data: unknown;
  /** Assigned chapter ID */
  chapterId: string;
  /** Chapter display name */
  chapterName: string;
  /** Whether this is the first section in its chapter */
  isChapterStart: boolean;
  /** Whether this is the last section in its chapter */
  isChapterEnd: boolean;
  /** Original index in sections array */
  originalIndex: number;
};

/**
 * Chapter group with its sections
 */
export type ChapterGroup = {
  chapter: Chapter;
  sections: ChapteredSection[];
  /** Index of this chapter in the sequence */
  chapterIndex: number;
};

// =============================================================================
// Default Chapter Definitions by Event Type
// =============================================================================

/**
 * Wedding chapter definitions
 * Ordered by typical narrative flow
 */
export const WEDDING_CHAPTERS: Chapter[] = [
  {
    id: "welcome",
    name: "Welcome",
    subtitle: "The details",
    sectionTypes: ["details"],
    style: "minimal",
  },
  {
    id: "our-story",
    name: "Our Story",
    subtitle: "How we met",
    sectionTypes: ["story", "weddingParty"],
    style: "decorative",
  },
  {
    id: "celebration",
    name: "The Celebration",
    subtitle: "Join us",
    sectionTypes: ["schedule", "attire"],
    style: "decorative",
  },
  {
    id: "plan-visit",
    name: "Plan Your Visit",
    subtitle: "Getting there",
    sectionTypes: ["travelStay", "map", "thingsToDo"],
    style: "minimal",
  },
  {
    id: "memories",
    name: "Memories",
    subtitle: "Our moments",
    sectionTypes: ["gallery"],
    style: "decorative",
  },
  {
    id: "respond",
    name: "RSVP",
    subtitle: "Let us know",
    sectionTypes: ["rsvp", "faq"],
    style: "minimal",
  },
];

/**
 * Conference chapter definitions
 */
export const CONFERENCE_CHAPTERS: Chapter[] = [
  {
    id: "about",
    name: "About",
    sectionTypes: ["details"],
    style: "minimal",
  },
  {
    id: "program",
    name: "Program",
    subtitle: "What to expect",
    sectionTypes: ["schedule", "speakers"],
    style: "minimal",
  },
  {
    id: "venue",
    name: "Venue",
    subtitle: "Location & logistics",
    sectionTypes: ["map", "faq"],
    style: "minimal",
  },
  {
    id: "partners",
    name: "Partners",
    sectionTypes: ["sponsors"],
    style: "minimal",
  },
  {
    id: "gallery",
    name: "Gallery",
    sectionTypes: ["gallery"],
    style: "minimal",
  },
  {
    id: "register",
    name: "Register",
    sectionTypes: ["rsvp"],
    style: "minimal",
  },
];

/**
 * Party chapter definitions (more casual grouping)
 */
export const PARTY_CHAPTERS: Chapter[] = [
  {
    id: "the-party",
    name: "The Party",
    sectionTypes: ["details", "schedule"],
    style: "minimal",
  },
  {
    id: "the-place",
    name: "The Place",
    sectionTypes: ["map"],
    style: "minimal",
  },
  {
    id: "the-vibe",
    name: "The Vibe",
    sectionTypes: ["gallery"],
    style: "minimal",
  },
  {
    id: "the-rsvp",
    name: "Are You In?",
    sectionTypes: ["rsvp", "faq"],
    style: "minimal",
  },
];

/**
 * Fallback chapter for sections that don't match any defined chapter
 */
const UNCATEGORIZED_CHAPTER: Chapter = {
  id: "more",
  name: "More",
  sectionTypes: [],
  style: "minimal",
};

// =============================================================================
// Chapter Inference Functions
// =============================================================================

/**
 * Get chapter definitions for an event type
 */
export function getChaptersForEventType(
  templateId: string
): Chapter[] {
  if (templateId.startsWith("wedding")) {
    return WEDDING_CHAPTERS;
  }
  if (templateId.startsWith("conference")) {
    return CONFERENCE_CHAPTERS;
  }
  if (templateId.startsWith("party")) {
    return PARTY_CHAPTERS;
  }
  // Default to wedding chapters as they're the most comprehensive
  return WEDDING_CHAPTERS;
}

/**
 * Find which chapter a section type belongs to
 */
export function findChapterForSection(
  sectionType: string,
  chapters: Chapter[]
): Chapter {
  const chapter = chapters.find((ch) =>
    ch.sectionTypes.includes(sectionType)
  );
  return chapter || UNCATEGORIZED_CHAPTER;
}

/**
 * Assign chapters to sections based on their types
 * Maintains original section order while adding chapter metadata
 */
export function assignChaptersToSections<
  T extends { type: string; enabled: boolean; data: unknown }
>(
  sections: T[],
  chapters: Chapter[]
): ChapteredSection[] {
  const enabledSections = sections.filter((s) => s.enabled);

  return enabledSections.map((section, index) => {
    const chapter = findChapterForSection(section.type, chapters);

    // Determine if this is chapter start/end by checking adjacent sections
    const prevSection = index > 0 ? enabledSections[index - 1] : null;
    const nextSection = index < enabledSections.length - 1 ? enabledSections[index + 1] : null;

    const prevChapter = prevSection
      ? findChapterForSection(prevSection.type, chapters)
      : null;
    const nextChapter = nextSection
      ? findChapterForSection(nextSection.type, chapters)
      : null;

    const isChapterStart = !prevChapter || prevChapter.id !== chapter.id;
    const isChapterEnd = !nextChapter || nextChapter.id !== chapter.id;

    return {
      type: section.type,
      enabled: section.enabled,
      data: section.data,
      chapterId: chapter.id,
      chapterName: chapter.name,
      isChapterStart,
      isChapterEnd,
      originalIndex: sections.indexOf(section),
    };
  });
}

/**
 * Group sections by their chapters
 * Returns chapters in the order they appear (based on first section of each chapter)
 */
export function groupSectionsByChapter<
  T extends { type: string; enabled: boolean; data: unknown }
>(
  sections: T[],
  chapters: Chapter[]
): ChapterGroup[] {
  const chaptered = assignChaptersToSections(sections, chapters);

  // Group by chapter while maintaining appearance order
  const groups: Map<string, ChapterGroup> = new Map();
  let chapterIndex = 0;

  for (const section of chaptered) {
    if (!groups.has(section.chapterId)) {
      const chapter = findChapterForSection(section.type, chapters);
      groups.set(section.chapterId, {
        chapter,
        sections: [],
        chapterIndex: chapterIndex++,
      });
    }
    groups.get(section.chapterId)!.sections.push(section);
  }

  return Array.from(groups.values());
}

/**
 * Check if a chapter break should be rendered before a section
 * Returns the chapter if a break should be shown, null otherwise
 */
export function shouldShowChapterBreak(
  section: ChapteredSection,
  isFirstSection: boolean,
  showFirstChapter: boolean = false
): Chapter | null {
  if (!section.isChapterStart) {
    return null;
  }

  // Optionally skip the first chapter break (after hero)
  if (isFirstSection && !showFirstChapter) {
    return null;
  }

  const chapters = WEDDING_CHAPTERS; // Will be parameterized
  return findChapterForSection(section.type, chapters);
}

/**
 * Get chapter progress information for a section
 */
export function getChapterProgress(
  currentSection: ChapteredSection,
  allChaptered: ChapteredSection[]
): {
  currentChapter: number;
  totalChapters: number;
  sectionInChapter: number;
  totalInChapter: number;
} {
  const chapterIds = [...new Set(allChaptered.map((s) => s.chapterId))];
  const currentChapterIndex = chapterIds.indexOf(currentSection.chapterId);
  const sectionsInChapter = allChaptered.filter(
    (s) => s.chapterId === currentSection.chapterId
  );
  const sectionIndex = sectionsInChapter.findIndex(
    (s) => s.originalIndex === currentSection.originalIndex
  );

  return {
    currentChapter: currentChapterIndex + 1,
    totalChapters: chapterIds.length,
    sectionInChapter: sectionIndex + 1,
    totalInChapter: sectionsInChapter.length,
  };
}
