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
 * Conference FAQ Section
 * Clean accordion with professional styling.
 */
export function FAQSection({ data, primaryColor }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Frequently asked questions">
      <SectionTitle>FAQ</SectionTitle>
      <div className="mx-auto max-w-3xl">
        <div className="divide-y rounded-xl border bg-card">
          {data.items.map((item, index) => (
            <div key={index}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={cn(
                  "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50",
                  index === 0 && "rounded-t-xl",
                  index === data.items.length - 1 && openIndex !== index && "rounded-b-xl"
                )}
                aria-expanded={openIndex === index}
              >
                <span className="pr-4 font-medium">{item.q}</span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    openIndex === index ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                  style={openIndex === index ? { backgroundColor: primaryColor } : undefined}
                >
                  <svg
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openIndex === index && "rotate-180"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
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
                  <div
                    className={cn(
                      "px-6 pb-4 text-muted-foreground",
                      index === data.items.length - 1 && "rounded-b-xl"
                    )}
                  >
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
