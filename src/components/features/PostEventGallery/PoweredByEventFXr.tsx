/**
 * Lightweight "Powered by EventFXr" attribution rendered at the bottom
 * of standalone pages that don't inherit a template footer. Currently
 * mounted on `/e/[slug]/gallery` (the dedicated post-event page has its
 * own neutral shell, not the event template's footer).
 *
 * Audit follow-up: other sub-routes (`/e/[slug]/wishes`, `/e/[slug]/registry`,
 * `/e/[slug]/live`) re-use the event template shell so they already get
 * the template footer — sweep them separately if the gap recurs.
 */
export function PoweredByEventFXr() {
  return (
    <footer className="border-t border-border bg-background px-4 py-6 text-center">
      <p className="text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://eventfxr.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-4 transition hover:underline"
        >
          EventFXr
        </a>
      </p>
    </footer>
  );
}
