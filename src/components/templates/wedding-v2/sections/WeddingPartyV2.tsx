import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";
import type { PartySide } from "@/schemas/event-page";

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

type WeddingPartyV2Props = {
  data: {
    heading?: string;
    description?: string;
    members: PartyMember[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Wedding Party V2 - Side-by-side columns with explicit side labels.
 *
 * Uses the `side` field on each member for grouping (no keyword heuristics).
 * Falls back to ungrouped grid when no `side` is set.
 */
export function WeddingPartyV2({
  data,
  assets,
  primaryColor,
}: WeddingPartyV2Props) {
  const { heading = "The Wedding Party", description, members } = data;

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  // Group by explicit side field
  const bridesSide = members.filter((m) => m.side === "bride");
  const groomsSide = members.filter((m) => m.side === "groom");
  const others = members.filter((m) => !m.side || m.side === "other");

  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;

  const renderMember = (member: PartyMember, index: number) => {
    const imageUrl = getAssetUrl(member.imageAssetId);

    return (
      <div key={index} className="flex flex-col items-center text-center">
        {/* Photo */}
        <div
          className="mb-4 h-36 w-36 overflow-hidden rounded-full border-4 shadow-md"
          style={{ borderColor: `${primaryColor}25` }}
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
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <svg
                className="h-12 w-12"
                style={{ color: `${primaryColor}40` }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>

        <h4 className="text-lg font-semibold">{member.name}</h4>
        <p
          className="text-sm font-medium"
          style={{ color: primaryColor }}
        >
          {member.role}
        </p>
        {member.bio && (
          <p className="mt-2 max-w-[200px] text-sm text-muted-foreground line-clamp-3">
            {member.bio}
          </p>
        )}
      </div>
    );
  };

  const renderGroup = (title: string, groupMembers: PartyMember[]) => (
    <div>
      <h3
        className="mb-6 text-center text-lg font-medium tracking-wide"
        style={{ color: primaryColor }}
      >
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
        {groupMembers.map(renderMember)}
      </div>
    </div>
  );

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

        {hasSides ? (
          <div className="grid gap-16 md:grid-cols-2">
            {/* Side-by-side layout */}
            {bridesSide.length > 0 && renderGroup("Bride's Side", bridesSide)}
            {groomsSide.length > 0 && renderGroup("Groom's Side", groomsSide)}
          </div>
        ) : null}

        {/* Others / ungrouped */}
        {others.length > 0 && (
          <div className={hasSides ? "mt-12" : ""}>
            {hasSides && others.length > 0 && (
              <h3
                className="mb-6 text-center text-lg font-medium tracking-wide"
                style={{ color: primaryColor }}
              >
                Special Roles
              </h3>
            )}
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
              {others.map(renderMember)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {members.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <p className="text-muted-foreground">
              Wedding party details coming soon
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
