"use client";

import { cn } from "@/lib/utils";
import { stripNonDialChars, toWhatsAppNumber, isE164 } from "@/lib/phone";

type SharePhoneInviteProps = {
  /** Recipient phone in E.164, e.g. "+14155551234". */
  phone: string;
  /** The fully-built RSVP link to share. */
  link: string;
  /** Guest name for a personalized greeting (optional). */
  guestName?: string | null;
  /** Event title for a personalized message (optional). */
  eventTitle?: string;
  /** Reuses the table's existing copy handler so the "Copied!" badge fires. */
  onCopy: () => void;
  /** Fired when the organizer activates ANY channel (WhatsApp / SMS / Copy) so
   *  the row can be optimistically marked as shared. */
  onShared: () => void;
};

/**
 * Channel picker for the phone-only ad-hoc invite flow. We already store the
 * recipient number in E.164, so instead of just copying the link we can hand
 * the OS a message that is *pre-addressed and pre-filled* — the organizer just
 * taps send. This is the no-cost bridge until automated delivery (Twilio)
 * lands at GA.
 *
 * - WhatsApp (`wa.me`) is the primary CTA: widest reach for event audiences,
 *   pre-fills recipient + message, and works on desktop WhatsApp Web too.
 * - SMS (`sms:`) is the universal fallback that uses the native Messages app.
 *   The `?&body=` form is the cross-platform hack that works on both iOS and
 *   Android (iOS wants `&body`, Android wants `?body`).
 * - Copy link stays as the desktop / no-handler fallback.
 */
export function SharePhoneInvite({
  phone,
  link,
  guestName,
  eventTitle,
  onCopy,
  onShared,
}: SharePhoneInviteProps) {
  // Trim *before* the truthiness check so a whitespace-only name doesn't
  // produce a dangling "Hi , ".
  const trimmedName = guestName?.trim();
  const greeting = trimmedName ? `Hi ${trimmedName}, ` : "";
  const titlePart = eventTitle ? ` to ${eventTitle}` : "";
  const message = `${greeting}you're invited${titlePart}! Please RSVP here: ${link}`;
  const encoded = encodeURIComponent(message);

  // Normalize defensively — legacy/imported rows may carry formatting. The
  // deep links need a full international number; if we can't confirm E.164
  // (e.g. a national number with no country code), fall back to Copy-only
  // rather than open a wrong-country WhatsApp chat or mis-addressed SMS.
  const dialable = stripNonDialChars(phone); // E.164 with "+", normalized
  const waNumber = toWhatsAppNumber(dialable); // digits only, for wa.me
  const phoneUsable = isE164(dialable);
  const waHref = `https://wa.me/${waNumber}?text=${encoded}`;
  // sms: keeps the leading "+". `?&body=` is the iOS/Android-compatible form.
  const smsHref = `sms:${dialable}?&body=${encoded}`;

  const baseBtn =
    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors";
  const secondaryBtn = "bg-foreground/10 text-foreground hover:bg-foreground/20";

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* WhatsApp/SMS deep links need a confirmed E.164 number; for anything
          else we degrade to Copy-only rather than open a wrong recipient. */}
      {phoneUsable && (
        <>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              onShared();
            }}
            title="Open WhatsApp with the invite pre-filled — just tap send"
            className={cn(
              baseBtn,
              "bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            )}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>

          <a
            href={smsHref}
            onClick={(e) => {
              e.stopPropagation();
              onShared();
            }}
            title="Open Messages with the invite pre-filled"
            className={cn(baseBtn, secondaryBtn)}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            SMS
          </a>
        </>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShared();
          onCopy();
        }}
        title="Copy the RSVP link to share manually"
        className={cn(baseBtn, secondaryBtn)}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.28" />
        </svg>
        Copy link
      </button>
    </div>
  );
}
