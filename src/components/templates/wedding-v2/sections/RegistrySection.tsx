import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";

type RegistryItem = {
  name: string;
  url?: string;
  logoAssetId?: string;
};

type RegistrySectionProps = {
  data: {
    heading?: string;
    description?: string;
    items: RegistryItem[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Registry Section - Gift registry cards with logos/links
 */
export function RegistrySection({ data, assets, primaryColor }: RegistrySectionProps) {
  const { heading = "Gift Registry", description, items } = data;

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  return (
    <SectionWrapper ariaLabel="Gift registry">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {description && (
          <p className="mb-8 text-center text-muted-foreground">
            {description}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const logoUrl = getAssetUrl(item.logoAssetId);
            const hasLink = item.url && item.url.length > 0;

            const content = (
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: `${primaryColor}15` }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={item.name}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${primaryColor}12` }}
                  >
                    <svg
                      className="h-6 w-6"
                      style={{ color: primaryColor }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                      />
                    </svg>
                  </div>
                )}
                <p className="font-semibold">{item.name}</p>
                {hasLink && (
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: primaryColor }}
                  >
                    View Registry &rarr;
                  </span>
                )}
              </div>
            );

            if (hasLink) {
              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {content}
                </a>
              );
            }

            return <div key={index}>{content}</div>;
          })}
        </div>

        {items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <p className="text-muted-foreground">
              Registry information coming soon
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
