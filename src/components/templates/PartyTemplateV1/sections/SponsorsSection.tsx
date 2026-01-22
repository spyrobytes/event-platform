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
  platinum: "VIP Sponsors",
  gold: "Gold Sponsors",
  silver: "Silver Sponsors",
  bronze: "Bronze Sponsors",
  partner: "Friends",
};

/**
 * Sponsors Section for Party template
 * Fun, vibrant styling with playful elements
 */
export function SponsorsSection({ data, assets, primaryColor }: SponsorsSectionProps) {
  const { heading = "Made Possible By", description, showTiers, items } = data;

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
        <div className="mb-4 text-4xl">🎁</div>
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12 space-y-10">
        {groupedSponsors.map(({ tier, sponsors }, groupIndex) => (
          <div key={tier || groupIndex}>
            {showTiers && tier && (
              <div className="mb-6 text-center">
                <span
                  className="inline-block rounded-full px-6 py-2 text-sm font-bold"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  {TIER_LABELS[tier]}
                </span>
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
                    className="group relative overflow-hidden rounded-2xl border-4 bg-card p-5 transition-transform hover:scale-105"
                    style={{ borderColor: `${primaryColor}40` }}
                  >
                    {/* Decorative corner */}
                    <div
                      className="absolute -right-3 -top-3 h-10 w-10 rounded-full opacity-30"
                      style={{ backgroundColor: primaryColor }}
                    />

                    <div className="flex min-w-[120px] flex-col items-center">
                      {logoAsset?.publicUrl ? (
                        <div className="flex h-16 w-32 items-center justify-center">
                          <img
                            src={logoAsset.publicUrl}
                            alt={sponsor.name}
                            className="max-h-16 w-auto object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-16 w-32 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${primaryColor}10` }}
                        >
                          <span
                            className="text-center text-sm font-bold"
                            style={{ color: primaryColor }}
                          >
                            {sponsor.name}
                          </span>
                        </div>
                      )}
                      {sponsor.description && (
                        <p className="mt-3 max-w-[140px] text-center text-xs text-muted-foreground">
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
                    className="transition-opacity hover:opacity-90"
                  >
                    {card}
                  </a>
                ) : (
                  card
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
