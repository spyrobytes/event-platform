/**
 * The landing page's one-story sample event. Every section that shows event
 * data (CreationDemo's dashboard, ProductValueSplit's funnel/console) reads
 * these constants so the page can never contradict itself — before this
 * module, the numbers were duplicated as literals guarded only by comments.
 * The couple matches the real captures in public/landing/templates/;
 * TemplateShowcase's prose alt text stays freehand on purpose.
 */
export const STORY = {
  eventName: "Avery & Jordan's Wedding",
  dateLine: "Sat, Jun 20, 2026 · 4:00 PM",
  dateDay: "20",
  dateMonth: "JUN",
  time: "4:00 PM",
  venue: "Rosewood Garden Estate",
  invited: 120,
  opened: 104,
  responded: 86,
  attending: 74,
  daysToGo: 164,
  responseRate: "72%", // = responded / invited
} as const;
