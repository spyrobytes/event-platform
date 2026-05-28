type Props = {
  heading?: string;
  message?: string;
};

/**
 * Optional thank-you / reflection block between the hero and the photo
 * grid. Renders nothing when both heading and message are absent — the
 * `optionalTrimmedString` transform in `galleryPresentationSchema`
 * coerces empty/whitespace input to `undefined`, so a render here means
 * the organizer explicitly set copy.
 *
 * Narrow content width + serif heading keep this visually distinct from
 * the photo grid that follows.
 */
export function ThankYouSection({ heading, message }: Props) {
  if (!heading && !message) return null;

  return (
    <section className="border-t border-border bg-muted/30 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-prose space-y-4 text-center">
        {heading && (
          <h2 className="font-serif text-2xl font-medium leading-tight text-foreground md:text-3xl">
            {heading}
          </h2>
        )}
        {message && (
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
