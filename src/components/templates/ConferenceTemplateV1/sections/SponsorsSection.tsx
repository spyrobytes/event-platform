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
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  partner: "Partners",
};
const TIER_SIZES: Record<SponsorTier, { width: number; height: number }> = {
  platinum: { width: 200, height: 100 },
  gold: { width: 160, height: 80 },
  silver: { width: 140, height: 70 },
  bronze: { width: 120, height: 60 },
  partner: { width: 100, height: 50 },
};

/**
 * Sponsors Section for Conference template
 * Professional layout with tiered sizing
 */
export function SponsorsSection({ data, assets, primaryColor }: SponsorsSectionProps) {
  const { heading = "Our Sponsors", description, showTiers, items } = data;

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
        items.filter((s) => !s.tier).length > 0
          ? [{ tier: "partner" as SponsorTier, sponsors: items.filter((s) => !s.tier) }]
          : []
      )
    : [{ tier: null, sponsors: items }];

  return (
    <SectionWrapper ariaLabel="Sponsors">
      <div className="mx-auto max-w-2xl text-center">
        <div
          className="mb-4 inline-block rounded-full px-4 py-1 text-sm font-medium"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          Sponsors & Partners
        </div>
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12 space-y-10">
        {groupedSponsors.map(({ tier, sponsors }, groupIndex) => {
          const size = tier ? TIER_SIZES[tier] : TIER_SIZES.silver;

          return (
            <div key={tier || groupIndex}>
              {showTiers && tier && (
                <div className="mb-6 flex items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span
                    className="rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    {TIER_LABELS[tier]}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-6">
                {sponsors.map((sponsor, index) => {
                  const logoAsset = sponsor.logoAssetId
                    ? assets.find((a) => a.id === sponsor.logoAssetId)
                    : null;

                  const card = (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg"
                      style={{ width: size.width + 48, minHeight: size.height + 48 }}
                    >
                      <div className="flex h-full flex-col items-center justify-center">
                        {logoAsset?.publicUrl ? (
                          <img
                            src={logoAsset.publicUrl}
                            alt={sponsor.name}
                            className="object-contain transition-transform group-hover:scale-105"
                            style={{ maxWidth: size.width, maxHeight: size.height }}
                          />
                        ) : (
                          <span className="text-center font-semibold text-muted-foreground">
                            {sponsor.name}
                          </span>
                        )}
                        {sponsor.description && (
                          <p className="mt-3 text-center text-xs text-muted-foreground line-clamp-2">
                            {sponsor.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );

                  return sponsor.websiteUrl ? (
                    <a
                      key={index}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {card}
                    </a>
                  ) : (
                    card
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
