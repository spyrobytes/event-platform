import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "EventsFixer - Create and Discover Events",
    template: "%s | EventsFixer",
  },
  description:
    "The modern event platform for creating, discovering, and managing events. Free event creation with invitations, RSVPs, and email notifications.",
  keywords: [
    "events",
    "event platform",
    "create events",
    "discover events",
    "event management",
    "RSVP",
    "invitations",
  ],
  authors: [{ name: "EventsFixer" }],
  creator: "EventsFixer",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "EventsFixer",
    title: "EventsFixer - Create and Discover Events",
    description:
      "The modern event platform for creating, discovering, and managing events. Free event creation with invitations, RSVPs, and email notifications.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EventsFixer - Create and Discover Events",
    description:
      "The modern event platform for creating, discovering, and managing events.",
    creator: "@eventsfixer",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
