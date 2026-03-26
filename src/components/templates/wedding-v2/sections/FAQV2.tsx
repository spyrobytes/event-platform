"use client";

import { useState } from "react";
import type { FAQSection } from "@/schemas/event-page";

type FAQV2Props = { data: FAQSection["data"] };

/**
 * FAQ V2 — cinematic wedding template FAQ section.
 *
 * Expandable accordion cards with smooth height transitions.
 * Each item toggles independently.
 */
export function FAQV2({ data }: FAQV2Props) {
  const { items, heading, description } = data;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || "Common Questions";
  const kickerText = "FAQ";
  const showKicker = kickerText.toLowerCase() !== displayHeading.toLowerCase();

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="FAQ"
      id="faq"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          {showKicker && (
            <p
              className="v2-kicker"
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--sm, 0.85rem)",
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase" as const,
                color: "var(--accent, #7a8c72)",
                marginBottom: 12,
              }}
            >
              {kickerText}
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--night, #1e1b17)",
            }}
          >
            {displayHeading}
          </h2>
          {description && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {description}
            </p>
          )}
        </div>

        {/* FAQ list */}
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap, 20px)",
          }}
        >
          {hasItems ? (
            items.map((item, i) => (
              <FAQCard key={i} question={item.q} answer={item.a} />
            ))
          ) : (
            <div
              style={{
                border: "2px dashed var(--border, #e8e1d6)",
                borderRadius: "var(--r-lg, 24px)",
                padding: "clamp(32px, 4vw, 48px)",
                textAlign: "center",
                color: "var(--stone, #a69e93)",
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
              }}
            >
              Questions &amp; answers coming soon
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQCard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r-lg, 24px)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
        transition:
          "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-lg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
    >
      {/* Question header — clickable toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          width: "100%",
          padding: "clamp(24px, 3vw, 32px)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: "1.15rem",
            fontWeight: 400,
            lineHeight: 1.3,
            color: "var(--night, #1e1b17)",
            margin: 0,
            flex: 1,
          }}
        >
          {question}
        </h3>

        {/* Arrow icon */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: "50%",
            background: "var(--cream, #f0ebe3)",
            color: "var(--accent, #7a8c72)",
            transition: "transform .35s var(--ease-out-expo, ease)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 5.5 L7 9.5 L11 5.5" />
          </svg>
        </span>
      </button>

      {/* Answer — animated reveal via grid-rows */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows .4s var(--ease-out-expo, ease)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "0 clamp(24px, 3vw, 32px) clamp(24px, 3vw, 32px)",
            }}
          >
            <p
              style={{
                fontSize: "var(--body, 1rem)",
                lineHeight: 1.75,
                color: "var(--text-2, #786f65)",
                margin: 0,
              }}
            >
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
