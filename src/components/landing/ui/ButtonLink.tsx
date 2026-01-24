"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import React from "react";
import { handleAnchorClick } from "./smooth-scroll";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  ariaLabel?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  ariaLabel,
}: ButtonLinkProps) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: Record<NonNullable<ButtonLinkProps["variant"]>, string> = {
    primary: "bg-black text-white hover:opacity-90 focus:ring-black",
    secondary: "bg-white/90 text-black ring-1 ring-black/10 hover:bg-white focus:ring-black",
    ghost: "text-black/80 hover:text-black underline underline-offset-4",
  };

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={(e) => handleAnchorClick(e, href)}
      className={cn(base, variants[variant], className)}
    >
      {children}
    </Link>
  );
}
