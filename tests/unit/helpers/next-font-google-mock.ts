/**
 * Shared stub for `next/font/google` — its fonts are invoked at module load
 * and are not functions under jsdom, so any test importing a tree that
 * transitively loads them (e.g. the templates barrel via PreludeBlock) must
 * mock the module FIRST:
 *
 *   vi.mock("next/font/google", () => import("./helpers/next-font-google-mock"));
 *
 * If a new next/font/google font is added anywhere in such a tree, add its
 * export below — the failure message points straight at the missing name,
 * and every opted-in test file picks the fix up from this one place.
 */
const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });

export const Great_Vibes = font;
export const Dancing_Script = font;
export const Playfair_Display = font;
export const Cormorant_Garamond = font;
export const Pinyon_Script = font;
export const Geist = font;
export const Geist_Mono = font;
