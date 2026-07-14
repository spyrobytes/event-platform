import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Guest-facing renderers: event dates must show the VENUE's wall clock.
    // Raw formatters default to the machine's timezone, so a copy-pasted
    // block that drops `timeZone` silently reintroduces the viewer-local
    // bug. Route through the formatEvent* helpers in @/lib/utils (or
    // date-fns-tz formatInTimeZone, whose signature forces a timezone).
    // Calendar *math* (getCalendarParts in use-event-temporal.ts) lives in
    // src/hooks and is deliberately outside these globs.
    files: [
      "src/components/templates/**",
      "src/components/features/Invitation/**",
      "src/emails/**",
      "src/app/invite/**",
      "src/app/e/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message:
            "Use the formatEvent* helpers from @/lib/utils (or date-fns-tz formatInTimeZone) — raw Intl.DateTimeFormat defaults to the viewer's timezone; the venue timezone must be explicit.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString']",
          message:
            "Use the formatEvent* helpers from @/lib/utils — toLocaleDateString renders the viewer's timezone, not the venue's.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleTimeString']",
          message:
            "Use the formatEvent* helpers from @/lib/utils — toLocaleTimeString renders the viewer's timezone, not the venue's.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleString']",
          message:
            "Use the formatEvent* helpers from @/lib/utils — toLocaleString renders the viewer's timezone, not the venue's.",
        },
      ],
    },
  },
]);

export default eslintConfig;
