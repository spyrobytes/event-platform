import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "EventFXr privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-4 text-muted-foreground">
        Our privacy policy is currently under review and will be published here
        shortly. Thank you for your patience.
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
