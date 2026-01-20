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

export function FAQSection({ data, primaryColor }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Frequently asked questions">
      <SectionTitle>Questions & Answers</SectionTitle>
      <div className="mx-auto max-w-2xl">
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium pr-4">{item.q}</span>
                <svg
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                  style={{ color: primaryColor }}
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
                  <div className="border-t px-4 py-3 text-muted-foreground">
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
