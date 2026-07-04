import { JsonLdScript } from "./JsonLdScript";

/**
 * schema.org Organization structured data — the brand entity (name, logo,
 * canonical URL), rendered site-wide from the root layout. The logo must be
 * the real brand mark at >=112x112 (Google's minimum), not the favicon.
 */
export function OrganizationJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EventFXr",
    url: baseUrl,
    logo: `${baseUrl}/brand/eventfxr-logo.png`,
  };

  return <JsonLdScript data={jsonLd} />;
}
