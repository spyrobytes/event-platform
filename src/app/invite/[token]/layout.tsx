import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false, // Don't index invitation pages (private content)
    follow: false,
  },
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

/**
 * Layout for invitation pages.
 *
 * - Prevents search engine indexing (private invitations)
 * - Provides consistent container structure
 */
export default async function InviteLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
