import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug } from "@/lib/event-page-loader";
import { Button } from "@/components/ui/button";

// Stateless confirmation page. The actual RSVP write was committed by the
// submit endpoint; this page just acknowledges the response. Public-portal
// guests don't get a tokenized portal URL (the raw invite token never enters
// the public flow), so this is the end of the path.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; tk?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug, undefined);
  if (!event) return { title: "RSVP" };
  return {
    title: `RSVP confirmed — ${event.title}`,
    robots: { index: false, follow: false },
  };
}

const HEADINGS: Record<string, string> = {
  YES: "You're confirmed!",
  NO: "Thanks for letting us know",
  MAYBE: "We've noted your response",
};

// YES copy avoids a hard promise that the email contains a QR — the host can
// disable per-event QR attachment (`Event.attachQrToConfirmation`), and a
// rare QR pipeline failure ships the email without one. The "look for" verb
// invites the guest to check rather than asserting delivery.
const BODIES: Record<string, string> = {
  YES: "We've sent you a confirmation email. Look for your access QR code inside — show it at the venue when you arrive.",
  NO: "We'll miss you. If your plans change, contact the host to update your RSVP.",
  MAYBE: "We'll send a reminder closer to the event so you can confirm.",
};

export default async function ConfirmedPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { r, tk } = await searchParams;

  const event = await getEventBySlug(slug, undefined);
  if (!event) notFound();

  const response = r && r in HEADINGS ? r : "YES";
  const heading = HEADINGS[response];
  const body = BODIES[response];

  // Public-portal submit issues a fresh portal token; this page receives it
  // via `tk` and deep-links the CTA into the tokenized guest portal — same
  // shape as the invite-token flow's "View Event Details" link. Falls back to
  // the un-tokenized public page if the param is missing or empty.
  // Re-encode: Next.js delivers search params already URL-decoded, so emitting
  // them raw could mangle anything outside base64url's charset.
  const portalHref =
    tk && tk.length > 0
      ? `/e/${slug}?tk=${encodeURIComponent(tk)}`
      : `/e/${slug}`;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-16 sm:py-24">
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          <p className="mt-6 text-base font-medium">{event.title}</p>
        </div>

        <div className="mt-6 text-center">
          <Link href={portalHref} className="inline-block">
            <Button type="button">View Event Details</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
