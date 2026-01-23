import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
};

type WeddingPartySectionProps = {
  data: {
    heading?: string;
    description?: string;
    members: PartyMember[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Wedding Party Section - Bridal party introductions
 *
 * Used by: Classic, South Asian variants
 * Displays bridesmaids, groomsmen, and other party members.
 */
export function WeddingPartySection({
  data,
  assets,
  primaryColor,
}: WeddingPartySectionProps) {
  const { heading = "The Wedding Party", description, members } = data;

  // Helper to get asset URL
  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  // Split into bride's side and groom's side based on role keywords
  const bridesSide = members.filter(
    (m) =>
      m.role.toLowerCase().includes("bridesmaid") ||
      m.role.toLowerCase().includes("maid") ||
      m.role.toLowerCase().includes("bride")
  );

  const groomsSide = members.filter(
    (m) =>
      m.role.toLowerCase().includes("groomsman") ||
      m.role.toLowerCase().includes("best man") ||
      m.role.toLowerCase().includes("groom")
  );

  const others = members.filter(
    (m) => !bridesSide.includes(m) && !groomsSide.includes(m)
  );

  const renderMember = (member: PartyMember, index: number) => {
    const imageUrl = getAssetUrl(member.imageAssetId);

    return (
      <div key={index} className="flex flex-col items-center text-center">
        {/* Photo or placeholder */}
        <div
          className="mb-4 h-32 w-32 overflow-hidden rounded-full border-4 shadow-md"
          style={{ borderColor: `${primaryColor}30` }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={member.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <svg
                className="h-12 w-12"
                style={{ color: `${primaryColor}50` }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Name */}
        <h4 className="text-lg font-semibold">{member.name}</h4>

        {/* Role */}
        <p
          className="text-sm font-medium"
          style={{ color: primaryColor }}
        >
          {member.role}
        </p>

        {/* Bio */}
        {member.bio && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
            {member.bio}
          </p>
        )}
      </div>
    );
  };

  return (
    <SectionWrapper ariaLabel="Wedding party">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {description && (
          <p className="mb-10 text-center text-muted-foreground">
            {description}
          </p>
        )}

        {/* If we have clear sides, show them separately */}
        {bridesSide.length > 0 && groomsSide.length > 0 ? (
          <div className="space-y-12">
            {/* Bride's Side */}
            <div>
              <h3
                className="mb-6 text-center text-lg font-medium"
                style={{ color: primaryColor }}
              >
                Bride&apos;s Side
              </h3>
              <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
                {bridesSide.map(renderMember)}
              </div>
            </div>

            {/* Groom's Side */}
            <div>
              <h3
                className="mb-6 text-center text-lg font-medium"
                style={{ color: primaryColor }}
              >
                Groom&apos;s Side
              </h3>
              <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
                {groomsSide.map(renderMember)}
              </div>
            </div>

            {/* Others (flower girl, ring bearer, etc.) */}
            {others.length > 0 && (
              <div>
                <h3
                  className="mb-6 text-center text-lg font-medium"
                  style={{ color: primaryColor }}
                >
                  Special Roles
                </h3>
                <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
                  {others.map(renderMember)}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Simple grid if no clear sides */
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
            {members.map(renderMember)}
          </div>
        )}

        {/* Empty state */}
        {members.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <p className="text-muted-foreground">
              Wedding party details coming soon
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
