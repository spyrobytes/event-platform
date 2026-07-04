/**
 * Escape `<` so serialized content can never form a `</script>` sequence
 * and break out of a JSON-LD script tag. `<` is a plain JSON escape,
 * so consumers parsing with JSON.parse see identical data.
 */
export function toJsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The single choke-point for emitting schema.org JSON-LD. Every emitter
 * (EventJsonLd, FaqJsonLd, OrganizationJsonLd, and any future one) must
 * render through this component so the `</script>`-breakout escaping can't
 * be skipped — event titles and descriptions are user-provided.
 */
export function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLdString(data) }}
    />
  );
}
