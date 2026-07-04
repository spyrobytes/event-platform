import { toJsonLdString } from "./FaqJsonLd";

/**
 * schema.org Organization structured data for the landing page — feeds
 * search engines' brand entity (name, logo, canonical URL). Event pages
 * carry their own Event schema via EventJsonLd.
 */
export function OrganizationJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EventFXr",
    url: baseUrl,
    logo: `${baseUrl}/icon.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLdString(jsonLd) }}
    />
  );
}
