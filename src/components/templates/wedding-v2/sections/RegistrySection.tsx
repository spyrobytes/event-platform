"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MediaAsset } from "@prisma/client";
import type { RegistrySection as RegistrySectionData } from "@/schemas/event-page";
import { pickPreviewItems } from "@/lib/registry-claims";
import { EventImage } from "@/components/media/EventImage";

type ClaimSummary = {
  itemId: string;
  claimedByOthers: number;
  myClaimId: string | null;
  myClaimQuantity: number;
};

type RegistrySectionProps = {
  data: RegistrySectionData["data"];
  assets: MediaAsset[];
  eventId?: string;
  /** Event slug — used to build the "View full registry" CTA in preview mode. */
  eventSlug?: string;
  /** Server-computed per-item claim summaries. Present when the viewer
   * is a verified guest; undefined for public visitors. */
  claims?: Record<string, ClaimSummary>;
  /** True when the viewer arrived via a valid invite token. */
  canClaim?: boolean;
  /** "preview" renders the first 4 items + CTA on the main event page;
   *  "full" renders all items grouped by category on /e/[slug]/registry. */
  mode?: "preview" | "full";
};

const PREVIEW_CAP = 4;

/** Top-right pill badge shown when a gift is claimed or a fund is closed.
 * The two cases share visuals, so the label/aria text are caller-supplied. */
function StatusBadge({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  return (
    <span
      aria-label={ariaLabel}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        background: "var(--accent, #7a8c72)",
        color: "#fff",
        fontFamily: "var(--sans)",
        fontSize: ".7rem",
        fontWeight: 600,
        letterSpacing: ".12em",
        textTransform: "uppercase" as const,
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

/** Outbound link styled as the registry's primary action. Two callsites:
 * the gift card (compact padding) and the cash-fund banner (roomier).
 * Featured items render as a gold gradient pill, others as a transparent
 * outline pill — matching the section's visual hierarchy. */
function RegistryCTA({
  href,
  label,
  featured,
  size,
}: {
  href: string;
  label: string;
  featured: boolean;
  size: "card" | "banner";
}) {
  const padding = size === "banner" ? "14px 32px" : "12px 26px";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "var(--sans)",
        fontSize: "var(--sm, 0.85rem)",
        fontWeight: 600,
        letterSpacing: ".02em",
        padding,
        borderRadius: 999,
        textDecoration: "none",
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
        transition: "all var(--transition, 0.3s ease)",
        ...(featured
          ? {
              background: "linear-gradient(135deg, var(--gold, #c5a55a), var(--gold-d, #9e7e3a))",
              color: "#fff",
              border: "1px solid var(--gold, #c5a55a)",
            }
          : {
              background: "transparent",
              color: "var(--charcoal, #3d3830)",
              border: "1px solid var(--sand, #d4cabb)",
            }),
      }}
    >
      {label}
    </a>
  );
}

/**
 * Registry Section — POC-parity rewrite
 *
 * Cards with icon area, title, description, CTA button.
 * Primary card uses gold gradient button. Notes with border-top separator.
 * Phase 2: claim/unclaim UI lights up for guests with a valid invite token.
 */
export function RegistrySection({ data, assets, eventId, eventSlug, claims, canClaim, mode = "full" }: RegistrySectionProps) {
  const { heading = "Gift Registry", description, items } = data;
  const kickerText = "Gift Registry";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  const getAsset = (assetId?: string) => {
    if (!assetId) return null;
    return assets.find((a) => a.id === assetId) ?? null;
  };
  const getAssetUrl = (assetId?: string): string | null => {
    return getAsset(assetId)?.publicUrl || null;
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams?.get("tk") ?? null;
  const [busyItems, setBusyItems] = useState<Set<string>>(() => new Set());
  // Error keyed by itemId so the message appears on the card the user just
  // clicked, not off-screen at the section heading.
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});

  function markBusy(itemId: string, busy: boolean) {
    setBusyItems((prev) => {
      const next = new Set(prev);
      if (busy) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }
  const [, startTransition] = useTransition();
  const showClaimUI = canClaim && !!eventId && !!inviteToken;

  function setItemError(itemId: string, message: string | null) {
    setClaimErrors((prev) => {
      const next = { ...prev };
      if (message) next[itemId] = message;
      else delete next[itemId];
      return next;
    });
  }

  async function handleClaim(itemId: string) {
    if (!eventId || !inviteToken) return;
    setItemError(itemId, null);
    markBusy(itemId, true);
    try {
      const res = await fetch(`/api/events/${eventId}/registry/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken,
          itemId,
          quantity: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Claim failed");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setItemError(itemId, err instanceof Error ? err.message : "Claim failed");
    } finally {
      markBusy(itemId, false);
    }
  }

  async function handleUnclaim(itemId: string, claimId: string) {
    if (!eventId || !inviteToken) return;
    setItemError(itemId, null);
    markBusy(itemId, true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/registry/claims/${claimId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unclaim failed");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setItemError(itemId, err instanceof Error ? err.message : "Unclaim failed");
    } finally {
      markBusy(itemId, false);
    }
  }

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Gift registry"
      id="registry"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          {showKicker && (
            <p className="v2-kicker" style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}>
              {kickerText}
            </p>
          )}
          <h2 style={{
            fontFamily: "var(--cursive, var(--serif))",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--night, #1e1b17)",
          }}>
            {heading}
          </h2>
          {description && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {description}
            </p>
          )}
        </div>

        {/* Group items by category for "full" mode; render a flat preview
            bucket (featured-first, capped) for "preview" mode. The per-card
            JSX below is identical in both modes. */}
        {(() => {
          type Group = {
            key: string;
            label: string;
            showHeading: boolean;
            bucketItems: typeof items;
          };
          let groups: Group[];
          if (mode === "preview") {
            const previewItems = pickPreviewItems(items, PREVIEW_CAP);
            groups = [{
              key: "__preview__",
              label: "",
              showHeading: false,
              bucketItems: previewItems,
            }];
          } else {
            const UNCATEGORIZED = "__uncategorized__";
            const order: string[] = [];
            const buckets = new Map<string, typeof items>();
            for (const item of items) {
              const key = item.category?.trim() || UNCATEGORIZED;
              if (!buckets.has(key)) {
                buckets.set(key, []);
                order.push(key);
              }
              buckets.get(key)!.push(item);
            }
            const hasAnyCategorized = order.some((k) => k !== UNCATEGORIZED);
            groups = order.map((key) => ({
              key,
              label: key === UNCATEGORIZED ? "Everything else" : key,
              showHeading: hasAnyCategorized,
              bucketItems: buckets.get(key)!,
            }));
          }
          return groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 40 }}>
              {group.showHeading && (
                <h3
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "var(--sm, 0.85rem)",
                    fontWeight: 600,
                    letterSpacing: ".14em",
                    textTransform: "uppercase" as const,
                    color: "var(--accent, #7a8c72)",
                    marginBottom: 16,
                  }}
                >
                  {group.label}
                </h3>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "var(--gap, 20px)",
                }}
              >
                {group.bucketItems.map((item) => {
            const itemType = item.type ?? "link";
            const isFund = itemType === "fund";
            const logoUrl = getAssetUrl(item.logoAssetId);
            const imageAsset = getAsset(item.imageAssetId);
            const imageUrl = imageAsset?.publicUrl ?? null;
            const imageBlur = imageAsset?.blurDataUrl ?? null;
            const hasLink = !!item.url && item.url.length > 0;
            const isFeatured = !!item.featured;
            const isClaimed = !!item.purchased;
            const quantity = item.quantity ?? 1;
            const ctaLabel = isFund ? "Contribute" : "View Registry";

            // Guest-claim state. Funds aren't claimable (ongoing contributions,
            // not one-off purchases), and the organizer's `purchased` toggle
            // short-circuits everything.
            const summary = claims?.[item.id];
            const othersQty = summary?.claimedByOthers ?? 0;
            const myClaimId = summary?.myClaimId ?? null;
            const myClaimQty = summary?.myClaimQuantity ?? 0;
            const totalClaimed = othersQty + myClaimQty;
            const remaining = Math.max(0, quantity - totalClaimed);
            const showClaimControls = showClaimUI && !isFund && !isClaimed;
            const isBusy = busyItems.has(item.id);

            // Cash funds render as full-width banners — they have no per-unit
            // quantity (unlike gift items) and aren't claimed in-app, so the
            // tile is a Title + Goal + Description + Contribute layout.
            if (isFund) {
              return (
                <div
                  key={item.id}
                  role="article"
                  aria-label={`${item.name}${isClaimed ? " — fund closed" : ""}`}
                  style={{
                    position: "relative",
                    gridColumn: "1 / -1",
                    background: "var(--surface, #ffffff)",
                    border: "1px solid var(--border, #e8e1d6)",
                    borderRadius: "var(--r-lg, 24px)",
                    padding: "clamp(24px, 3vw, 32px)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(20px, 3vw, 32px)",
                    flexWrap: "wrap",
                    opacity: isClaimed ? 0.7 : 1,
                    transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  {isClaimed && <StatusBadge label="Closed" ariaLabel="Fund closed" />}

                  {imageUrl ? (
                    <div
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "var(--cream, #faf6ef)",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      <EventImage
                        src={imageUrl}
                        alt={item.name}
                        fill
                        sizes="88px"
                        loading="lazy"
                        blurDataURL={imageBlur}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: "rgba(122, 140, 114, 0.08)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--accent, #7a8c72)",
                        flexShrink: 0,
                      }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: 32, height: 32, objectFit: "contain" }}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={32} height={32}>
                          <path d="M12 1v22" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      )}
                    </div>
                  )}

                  <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3 style={{
                      fontFamily: "var(--cursive, var(--serif))",
                      fontSize: "clamp(1.3rem, 2vw, 1.6rem)",
                      fontWeight: 400,
                      lineHeight: 1.15,
                      color: "var(--night, #1e1b17)",
                    }}>
                      {item.name}
                    </h3>

                    {item.amountLabel && (
                      <p style={{
                        fontFamily: "var(--sans)",
                        fontSize: ".95rem",
                        fontWeight: 600,
                        color: "var(--accent, #7a8c72)",
                      }}>
                        {item.amountLabel}
                      </p>
                    )}

                    {item.description && (
                      <p style={{ color: "var(--text-2, #786f65)", fontSize: "var(--sm, 0.85rem)", lineHeight: 1.6 }}>
                        {item.description}
                      </p>
                    )}

                    <p style={{
                      color: "var(--stone, #a69e93)",
                      fontSize: ".8rem",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}>
                      {isClaimed
                        ? "This fund is no longer accepting contributions."
                        : hasLink
                          ? "Any amount is appreciated. Tap Contribute to send a gift."
                          : "Any amount is appreciated. Reach out to the couple to contribute."}
                    </p>

                    {item.note && (
                      <p style={{
                        fontSize: ".82rem",
                        color: "var(--stone, #a69e93)",
                        fontStyle: "italic",
                      }}>
                        {item.note}
                      </p>
                    )}
                  </div>

                  {hasLink && !isClaimed && (
                    <RegistryCTA href={item.url!} label="Contribute" featured={isFeatured} size="banner" />
                  )}
                </div>
              );
            }

            return (
              <div
                key={item.id}
                role="article"
                aria-label={`${item.name}${isClaimed ? " — claimed" : ""}`}
                style={{
                  position: "relative",
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8e1d6)",
                  borderRadius: "var(--r-lg, 24px)",
                  padding: "clamp(20px, 2vw, 24px)",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  opacity: isClaimed ? 0.7 : 1,
                  transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "var(--shadow)";
                }}
              >
                {isClaimed && <StatusBadge label="Claimed" ariaLabel="Gift claimed" />}

                {imageUrl ? (
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--cream, #faf6ef)",
                        marginBottom: 14,
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      <EventImage
                        src={imageUrl}
                        alt={item.name}
                        fill
                        sizes="96px"
                        loading="lazy"
                        blurDataURL={imageBlur}
                        style={{ objectFit: "cover" }}
                      />
                      {logoUrl && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: 4,
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                          }}
                        >
                          {/* Tiny 16x16 overlay — raw <img> since next/image overhead */}
                          {/* isn't worth it at this size. */}
                          <img
                            src={logoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{ width: 16, height: 16, objectFit: "contain" }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "rgba(122, 140, 114, 0.08)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--accent, #7a8c72)",
                        marginBottom: 4,
                      }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: 24, height: 24, objectFit: "contain" }}
                        />
                      ) : isFund ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                          <path d="M12 1v22" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M2 12h20" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      )}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: "var(--cursive, var(--serif))",
                    fontSize: "1.2rem",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: "var(--night, #1e1b17)",
                    marginBottom: item.amountLabel ? 2 : 6,
                  }}>
                    {item.name}
                  </h3>

                  {(item.amountLabel || (!isFund && quantity > 1)) && (
                    <p style={{
                      fontFamily: "var(--sans)",
                      fontSize: ".95rem",
                      fontWeight: 600,
                      color: "var(--accent, #7a8c72)",
                      marginBottom: 6,
                    }}>
                      {item.amountLabel}
                      {item.amountLabel && !isFund && quantity > 1 ? " · " : ""}
                      {!isFund && quantity > 1 ? `Qty ${quantity}` : ""}
                    </p>
                  )}

                {item.description && (
                  <p style={{ color: "var(--text-2, #786f65)", fontSize: "var(--sm, 0.85rem)", lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                )}

                {item.note && (
                  <p style={{
                    fontSize: ".82rem",
                    color: "var(--stone, #a69e93)",
                    fontStyle: "italic",
                  }}>
                    {item.note}
                  </p>
                )}

                {showClaimControls && totalClaimed > 0 && quantity > 1 && (
                  <p style={{
                    fontFamily: "var(--sans)",
                    fontSize: ".8rem",
                    color: "var(--stone, #a69e93)",
                  }}>
                    {totalClaimed} of {quantity} claimed
                  </p>
                )}

                <div style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap" as const,
                  alignItems: "center",
                  marginTop: "auto",
                }}>
                  {hasLink && !isClaimed && (
                    <RegistryCTA href={item.url!} label={ctaLabel} featured={isFeatured} size="card" />
                  )}

                  {showClaimControls && myClaimId && (
                    <button
                      type="button"
                      onClick={() => handleUnclaim(item.id, myClaimId)}
                      disabled={isBusy}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--sans)",
                        fontSize: "var(--sm, 0.85rem)",
                        fontWeight: 600,
                        padding: "12px 22px",
                        borderRadius: 999,
                        background: "var(--accent, #7a8c72)",
                        color: "#fff",
                        border: "1px solid var(--accent, #7a8c72)",
                        cursor: isBusy ? "wait" : "pointer",
                        opacity: isBusy ? 0.7 : 1,
                      }}
                      aria-label="Unclaim this gift"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Claimed
                    </button>
                  )}

                  {showClaimControls && !myClaimId && remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClaim(item.id)}
                      disabled={isBusy}
                      aria-label={`Claim ${item.name}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontFamily: "var(--sans)",
                        fontSize: "var(--sm, 0.85rem)",
                        fontWeight: 600,
                        padding: "12px 22px",
                        borderRadius: 999,
                        background: "transparent",
                        color: "var(--accent, #7a8c72)",
                        border: "1px solid var(--accent, #7a8c72)",
                        cursor: isBusy ? "wait" : "pointer",
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {isBusy ? "…" : "Claim"}
                    </button>
                  )}

                  {showClaimControls && !myClaimId && remaining === 0 && (
                    <span style={{
                      fontFamily: "var(--sans)",
                      fontSize: ".82rem",
                      color: "var(--stone, #a69e93)",
                      fontStyle: "italic",
                    }}>
                      Fully claimed
                    </span>
                  )}
                </div>

                {claimErrors[item.id] && (
                  <p role="alert" style={{
                    marginTop: 8,
                    color: "var(--warning, #b45309)",
                    fontFamily: "var(--sans)",
                    fontSize: ".78rem",
                  }}>
                    {claimErrors[item.id]}
                  </p>
                )}
              </div>
            );
                })}
              </div>
            </div>
          ));
        })()}

        {mode === "preview" && items.length > PREVIEW_CAP && eventSlug && (
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link
              href={`/e/${eventSlug}/registry${inviteToken ? `?tk=${encodeURIComponent(inviteToken)}` : ""}#registry`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--sans)",
                fontSize: "var(--sm, 0.85rem)",
                fontWeight: 600,
                letterSpacing: ".02em",
                padding: "12px 26px",
                borderRadius: 999,
                textDecoration: "none",
                background: "transparent",
                color: "var(--accent, #7a8c72)",
                border: "1px solid var(--accent, #7a8c72)",
                transition: "all var(--transition, 0.3s ease)",
              }}
            >
              View full registry ({items.length - PREVIEW_CAP} more) →
            </Link>
          </div>
        )}

        {items.length === 0 && (
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3, #a69e93)",
          }}>
            Registry information coming soon
          </div>
        )}
      </div>

    </section>
  );
}
