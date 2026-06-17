import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the EventFXr team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Contact
      </h1>
      <p className="mt-4 text-muted-foreground">
        We&apos;d love to hear from you. A contact form is on the way — in the
        meantime, you can reach us through your event dashboard.
      </p>
      <Link
        href="/events"
        className="mt-8 inline-block text-sm text-foreground underline"
      >
        Browse events →
      </Link>
    </div>
  );
}
