import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

type PopularLink = {
  href: string;
  icon: string;
  title: string;
  description: string;
};

const popularLinks: PopularLink[] = [
  {
    href: "/events",
    icon: "🎉",
    title: "Discover Events",
    description: "Browse events happening now",
  },
  {
    href: "/signup",
    icon: "✨",
    title: "Create an Event",
    description: "Start planning in minutes",
  },
  {
    href: "/docs",
    icon: "📖",
    title: "Docs",
    description: "Guides and how-tos",
  },
  {
    href: "/login",
    icon: "🔑",
    title: "Sign In",
    description: "Access your dashboard",
  },
];

export default function NotFound() {
  return (
    <main
      className={`${styles.container} flex min-h-screen items-center justify-center bg-background px-6 py-16`}
    >
      <div className="w-full max-w-3xl text-center">
        <Link
          href="/"
          aria-label="EventFXr home"
          className="mb-8 inline-flex flex-col items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo variant="full" className="scale-125" />
          <p className="text-sm font-medium tracking-tight text-foreground sm:text-base">
            Bring people together.{" "}
            <span className="text-muted-foreground">Without the chaos.</span>
          </p>
        </Link>

        <div className="mb-12">
          <div
            className={`${styles.errorCode} mb-6 flex items-center justify-center gap-2 font-black leading-[0.8]`}
            aria-hidden="true"
          >
            <span className={styles.four}>4</span>
            <span className={styles.zero}>0</span>
            <span className={styles.four}>4</span>
          </div>

          <h1 className="mb-6 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Oops! This page seems to have wandered off
          </h1>

          <div className="mb-8">
            <p className="mb-4 text-xl font-semibold text-foreground">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Even the best event plans sometimes need a redirect. Let&apos;s
              get you back to where you need to be.
            </p>
          </div>
        </div>

        <div className="mb-12 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
          <Link href="/">
            <Button size="lg">Back Home</Button>
          </Link>
          <Link href="/events">
            <Button size="lg" variant="outline">
              Discover Events
            </Button>
          </Link>
        </div>

        <div className="mb-10">
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            Or explore these popular pages:
          </h2>

          <nav className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {popularLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.linkCard} group flex items-center gap-4 rounded-lg border-2 border-transparent bg-surface-2 p-4 transition-all hover:-translate-y-0.5 hover:border-accent`}
              >
                <div
                  className={`${styles.linkIcon} flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl`}
                  aria-hidden="true"
                >
                  {link.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-accent">
                    {link.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div
          className={`${styles.encouragement} rounded-xl border border-border p-6`}
        >
          <p className="text-base leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-accent">
              Looking for a specific event?
            </strong>{" "}
            Try our{" "}
            <Link
              href="/events"
              className="text-accent underline-offset-4 hover:underline"
            >
              discovery page
            </Link>{" "}
            — new events are added every day.
          </p>
        </div>
      </div>
    </main>
  );
}
