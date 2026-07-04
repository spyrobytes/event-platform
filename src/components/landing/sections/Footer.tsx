"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { handleAnchorClick } from "../ui/smooth-scroll";
import linkStyles from "../ui/link-styles.module.css";

/*
 * Every destination here exists. The old footer carried placeholder links
 * (/pricing, /blog, /careers, /help, /status, /cookies), bare social URLs,
 * and a fake "All systems operational" status line — planned features that
 * never shipped. They return when their pages do.
 */
const navigation = {
  product: [
    { name: "Features", href: "#how-it-works" },
    { name: "Templates", href: "#templates" },
    { name: "Demo", href: "#demo" },
    { name: "Use Cases", href: "#use-cases" },
    { name: "FAQ", href: "#faq" },
  ],
  explore: [
    { name: "Discover Events", href: "/events" },
    { name: "Cities", href: "/cities" },
    { name: "Documentation", href: "/docs" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
  ],
};

const columns = [
  { title: "Product", links: navigation.product },
  { title: "Explore", links: navigation.explore },
  { title: "Company", links: navigation.company },
  { title: "Legal", links: navigation.legal },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={(e) => handleAnchorClick(e, href)}
      className={`${linkStyles.animatedLink} text-sm text-white/70 transition-colors hover:text-white`}
    >
      {children}
    </Link>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo variant="full" />
            <p className="mt-4 text-sm text-white/60 max-w-xs">
              The modern platform for creating, managing, and growing unforgettable events.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((item) => (
                    <li key={item.name}>
                      <FooterLink href={item.href}>{item.name}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-white/40 sm:text-left">
            &copy; {currentYear} EventFXr. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
