"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionWrapper, SectionTitle } from "../../shared";

type FAQItem = {
  q: string;
  a: string;
};

type FAQSectionProps = {
  data: {
    items: FAQItem[];
  };
  primaryColor: string;
};

/**
 * Party FAQ Section
 * Casual, friendly accordion with playful styling.
 */
export function FAQSection({ data, primaryColor }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Frequently asked questions">
      <SectionTitle>Got Questions?</SectionTitle>
      <div className="mx-auto max-w-2xl">
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/50"
                aria-expanded={openIndex === index}
              >
                <span className="pr-4 text-lg font-semibold">{item.q}</span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-200",
                    openIndex === index && "rotate-45"
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
              </button>
              <div
                className={cn(
                  "grid transition-all duration-200 ease-in-out",
                  openIndex === index
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t px-5 py-4 text-muted-foreground">
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
