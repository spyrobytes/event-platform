import type { Metadata } from "next";
import { LandingPage } from "@/components/landing";

export const metadata: Metadata = {
  title: "EventsFixer - The Modern Event Platform",
  description:
    "Create stunning event pages in minutes. Send invites, track RSVPs, and fill every seat — all from one place. Free to start, no credit card required.",
  openGraph: {
    title: "EventsFixer - The Modern Event Platform",
    description:
      "Create stunning event pages in minutes. Send invites, track RSVPs, and fill every seat — all from one place.",
    images: [
      {
        url: "/landing/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "EventsFixer - Create, Manage, and Grow Unforgettable Events",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EventsFixer - The Modern Event Platform",
    description:
      "Create stunning event pages in minutes. Send invites, track RSVPs, and fill every seat.",
    images: ["/landing/og-image.jpg"],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
