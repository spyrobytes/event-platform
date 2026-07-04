export type FaqItem = {
  question: string;
  answer: string;
};

/* Escape `<` so serialized content can never form a `</script>` sequence
   and break out of the JSON-LD script tag. */
export function toJsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * schema.org FAQPage structured data. Per Google's guidelines the markup
 * must mirror content visible on the page — pass the SAME items array the
 * visible FAQ renders, never a superset. Note: FAQ rich results (expandable
 * search snippets) are restricted to gov/health sites since 2023; this
 * markup targets AI answer engines and general machine readability, and the
 * visible copy carries the classic SEO value.
 */
export function FaqJsonLd({ items }: { items: readonly FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLdString(jsonLd) }}
    />
  );
}
