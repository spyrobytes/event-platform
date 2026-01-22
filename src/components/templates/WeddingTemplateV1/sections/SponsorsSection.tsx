"use client";

import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";
import type { SponsorItem, SponsorTier } from "@/schemas/event-page";

type SponsorsSectionProps = {
  data: {
    heading: string;
    description?: string;
    showTiers: boolean;
    items: SponsorItem[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

const TIER_ORDER: SponsorTier[] = ["platinum", "gold", "silver", "bronze", "partner"];
const TIER_LABELS: Record<SponsorTier, string> = {
  platinum: "Platinum Sponsors",
  gold: "Gold Sponsors",
  silver: "Silver Sponsors",
  bronze: "Bronze Sponsors",
  partner: "Partners",
};

/**
 * Sponsors Section for Wedding template
 * Elegant, understated styling suitable for wedding sponsors/vendors
 */
export function SponsorsSection({ data, assets, primaryColor }: SponsorsSectionProps) {
  const { heading = "With Thanks To", description, showTiers, items } = data;

  if (items.length === 0) {
    return null;
  }

  // Group sponsors by tier if showTiers is enabled
  const groupedSponsors = showTiers
    ? TIER_ORDER.reduce((acc, tier) => {
        const tierSponsors = items.filter((s) => s.tier === tier);
        if (tierSponsors.length > 0) {
          acc.push({ tier, sponsors: tierSponsors });
        }
        return acc;
      }, [] as { tier: SponsorTier; sponsors: SponsorItem[] }[]).concat(
        // Add sponsors without a tier at the end
        items.filter((s) => !s.tier).length > 0
          ? [{ tier: "partner" as SponsorTier, sponsors: items.filter((s) => !s.tier) }]
          : []
      )
    : [{ tier: null, sponsors: items }];

  return (
    <SectionWrapper ariaLabel="Sponsors" className="bg-muted/20">
      <div className="mx-auto max-w-2xl text-center">
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12 space-y-12">
        {groupedSponsors.map(({ tier, sponsors }, groupIndex) => (
          <div key={tier || groupIndex}>
            {showTiers && tier && (
              <h3
                className="mb-6 text-center text-sm font-medium uppercase tracking-wider"
                style={{ color: primaryColor }}
              >
                {TIER_LABELS[tier]}
              </h3>
            )}
            <div className="flex flex-wrap items-center justify-center gap-8">
              {sponsors.map((sponsor, index) => {
                const logoAsset = sponsor.logoAssetId
                  ? assets.find((a) => a.id === sponsor.logoAssetId)
                  : null;

                const content = (
                  <div
                    className="group flex flex-col items-center text-center"
                    key={index}
                  >
                    <div
                      className="flex h-24 w-40 items-center justify-center rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                      style={{ borderColor: `${primaryColor}20` }}
                    >
                      {logoAsset?.publicUrl ? (
                        <img
                          src={logoAsset.publicUrl}
                          alt={sponsor.name}
                          className="max-h-16 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {sponsor.name}
                        </span>
                      )}
                    </div>
                    {sponsor.description && (
                      <p className="mt-2 max-w-[160px] text-xs text-muted-foreground">
                        {sponsor.description}
                      </p>
                    )}
                  </div>
                );

                return sponsor.websiteUrl ? (
                  <a
                    key={index}
                    href={sponsor.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-80"
                  >
                    {content}
                  </a>
                ) : (
                  content
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
