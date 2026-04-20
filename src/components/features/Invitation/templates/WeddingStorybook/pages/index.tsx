"use client";

import Image from "next/image";
import Link from "next/link";
import type { StorybookData } from "../types";
import { ScatterText } from "../ScatterText";

type PageProps = {
  data: StorybookData;
  active: boolean;
};

/* ═══════════════════════════════════════════════════
   SPREAD 0 — Cover
   ═══════════════════════════════════════════════════ */

export function CoverLeft({ data, active }: PageProps) {
  const monogram =
    data.monogram ||
    `${(data.person1 || "")[0] || ""}${"&"}${(data.person2 || "")[0] || ""}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "10%",
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Decorative border */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "1px solid var(--sb-gold-muted)",
          borderRadius: "2px",
          pointerEvents: "none",
        }}
      />

      {/* Corner flourishes */}
      {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(
        (pos) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              width: "32px",
              height: "32px",
              ...(pos.includes("top") ? { top: "15px" } : { bottom: "15px" }),
              ...(pos.includes("left")
                ? { left: "15px" }
                : { right: "15px" }),
              borderColor: "var(--sb-gold)",
              borderStyle: "solid",
              borderWidth: 0,
              ...(pos.includes("top") ? { borderTopWidth: "1px" } : { borderBottomWidth: "1px" }),
              ...(pos.includes("left")
                ? { borderLeftWidth: "1px" }
                : { borderRightWidth: "1px" }),
              opacity: 0.7,
            }}
          />
        ),
      )}

      {/* Circular photo frame */}
      <div
        style={{
          position: "relative",
          width: "clamp(100px, 22vw, 200px)",
          height: "clamp(100px, 22vw, 200px)",
          borderRadius: "50%",
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.8)",
          transition: "all 1s 0.3s var(--sb-content-easing)",
          marginBottom: "var(--sb-block-gap, 1.5rem)",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            position: "absolute",
            inset: "-6px",
            borderRadius: "50%",
            border: "1px solid var(--sb-gold)",
            opacity: 0.5,
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: "absolute",
            inset: "-2px",
            borderRadius: "50%",
            border: "1px solid var(--sb-gold-muted)",
          }}
        />

        {/* Photo or gradient placeholder */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            position: "relative",
            background: data.couplePhotoUrl
              ? undefined
              : `
                radial-gradient(ellipse at 40% 35%, var(--sb-rose-muted) 0%, transparent 55%),
                radial-gradient(ellipse at 65% 65%, rgba(143, 168, 138, 0.3) 0%, transparent 50%),
                linear-gradient(145deg, var(--sb-page-dark-2) 0%, var(--sb-page-dark) 100%)
              `,
          }}
        >
          {data.couplePhotoUrl && (
            <Image
              src={data.couplePhotoUrl}
              alt={`${data.person1} and ${data.person2}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="200px"
            />
          )}

          {!data.couplePhotoUrl && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-script)",
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                color: "var(--sb-gold-light)",
                opacity: 0.6,
              }}
            >
              {(data.person1 || "")[0]}{(data.person2 || "")[0]}
            </div>
          )}
        </div>

        {/* Decorative sparkle dots around frame */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: "var(--sb-gold)",
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translate(calc(50% + clamp(53px, 11.5vw, 106px))) translate(-50%, -50%)`,
              opacity: active ? 0.5 : 0,
              transition: `opacity 0.6s ${0.6 + i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Monogram */}
      <div
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(1.8rem, 4vw, 3rem)",
          color: "var(--sb-gold)",
          lineHeight: 1,
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.85)",
          transition: "all 0.9s 0.5s var(--sb-content-easing)",
        }}
      >
        {monogram}
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: active ? "50px" : "0px",
          height: "1px",
          background: "var(--sb-gold)",
          margin: "1rem 0",
          transition: "width 0.8s 0.65s var(--sb-content-easing)",
        }}
      />

      {/* Hide generic date when ceremony/reception dates are configured */}
      {!data.ceremonyDate && !data.receptionDate && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.5rem, 0.9vw, 0.65rem)",
            letterSpacing: "0.12em",
            color: "var(--sb-text-on-dark-muted)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.8s 0.75s",
          }}
        >
          {data.date}, {data.year}
        </p>
      )}
    </div>
  );
}

export function CoverRight({ data, active }: PageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "8% 10%",
        textAlign: "center",
        transformStyle: "preserve-3d",
        perspective: "var(--sb-perspective)",
        position: "relative",
      }}
    >
      {/* Subtle inner border */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "1px solid var(--sb-gold-muted)",
          borderRadius: "2px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      {/* Header: Traditional or Modern */}
      {data.headerMode === "traditional" && data.person1FamilyName && data.person2FamilyName ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.8s 0.3s var(--sb-content-easing)",
            marginBottom: "var(--sb-block-gap, 1.4rem)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.45rem, 0.9vw, 0.6rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--sb-gold)",
            }}
          >
            The families of
          </p>
          <p
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "clamp(0.9rem, 2.5vw, 1.3rem)",
              fontWeight: 400,
              color: "var(--sb-gold)",
              lineHeight: 1.3,
            }}
          >
            {data.person1FamilyName} <span style={{ margin: "0 0.15em", fontStyle: "italic" }}>&amp;</span> {data.person2FamilyName}
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.45rem, 0.85vw, 0.58rem)",
              fontStyle: "italic",
              letterSpacing: "0.12em",
              color: "var(--sb-text-on-dark-muted)",
            }}
          >
            {data.familyInviteText || "invite you to the wedding of their children"}
          </p>
        </div>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.5rem, 1vw, 0.65rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.8s 0.3s var(--sb-content-easing)",
            marginBottom: "var(--sb-section-gap, 1.8rem)",
          }}
        >
          {data.headerText || "Together with their families"}
        </p>
      )}

      <h1
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
          fontWeight: 400,
          color: "var(--sb-gold)",
          lineHeight: 1.2,
          marginBottom: "0.15em",
        }}
      >
        <ScatterText text={data.person1} active={active} depth={400} />
      </h1>

      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.7rem, 1.3vw, 0.9rem)",
          fontStyle: "italic",
          color: "var(--sb-text-on-dark-muted)",
          opacity: active ? 1 : 0,
          transition: "opacity 0.8s 0.5s",
          margin: "0.3em 0",
        }}
      >
        &amp;
      </p>

      <h1
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
          fontWeight: 400,
          color: "var(--sb-gold)",
          lineHeight: 1.2,
        }}
      >
        <ScatterText text={data.person2} active={active} depth={400} stagger={0.03} />
      </h1>

      {data.headerMode !== "traditional" && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.5rem, 0.9vw, 0.65rem)",
            letterSpacing: "0.12em",
            color: "var(--sb-text-on-dark-muted)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.8s 0.55s",
            marginTop: "var(--sb-heading-gap, 1.2rem)",
            marginBottom: "var(--sb-block-gap, 1.5rem)",
          }}
        >
          request the pleasure of your company
          <br />
          at the celebration of their marriage
        </p>
      )}

      <div
        style={{
          width: active ? "40px" : "0px",
          height: "1px",
          background: "var(--sb-gold)",
          transition: "width 0.8s 0.6s var(--sb-content-easing)",
          marginBottom: "var(--sb-heading-gap, 1.2rem)",
        }}
      />

      <div
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.9s 0.65s var(--sb-content-easing)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.5rem, 0.9vw, 0.65rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--sb-text-on-dark)",
            lineHeight: 1.8,
          }}
        >
          {data.ceremonyDate || data.date}
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.65rem, 1.1vw, 0.8rem)",
            letterSpacing: "0.3em",
            color: "var(--sb-gold)",
            marginTop: "0.15em",
          }}
        >
          {data.year}
        </p>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontStyle: "italic",
          fontSize: "clamp(0.5rem, 0.85vw, 0.6rem)",
          color: "var(--sb-text-on-dark-muted)",
          marginTop: "var(--sb-heading-gap, 1.2rem)",
          lineHeight: 1.5,
          opacity: active ? 1 : 0,
          transition: "opacity 0.8s 0.8s",
        }}
      >
        {data.ceremonyVenue}
        <br />
        {data.ceremonyAddress}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SPREAD 1 — Our Story
   ═══════════════════════════════════════════════════ */

export function StoryLeft({ active }: PageProps) {
  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 40%, var(--sb-rose-muted) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 70%, rgba(143, 168, 138, 0.25) 0%, transparent 50%),
            linear-gradient(160deg, var(--sb-page-dark-2) 0%, var(--sb-page-dark) 100%)
          `,
          clipPath: active
            ? "polygon(0 0, 100% 0, 100% 100%, 0% 100%)"
            : "polygon(0 0, 0 0, 0 100%, 0% 100%)",
          transition: "clip-path 1s 0.3s var(--sb-content-easing)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(23, 27, 46, 0.55)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "12% 10%",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
            marginBottom: "var(--sb-subhead-gap, 0.8rem)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.5s",
          }}
        >
          Chapter One
        </p>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--sb-text-on-dark)",
            lineHeight: 1.15,
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.9s 0.6s var(--sb-content-easing)",
          }}
        >
          Our Story
        </h2>

        <div
          style={{
            width: active ? "40px" : "0px",
            height: "1px",
            background: "var(--sb-gold)",
            marginTop: "var(--sb-heading-gap, 1rem)",
            transition: "width 0.7s 0.8s var(--sb-content-easing)",
          }}
        />
      </div>
    </div>
  );
}

export function StoryRight({ data, active }: PageProps) {
  const story = data.story || {
    heading: "How We Met",
    paragraphs: [
      "It was an ordinary Tuesday evening when fate decided to intervene. A mutual friend\u2019s dinner party, a shared love of terrible puns, and one unforgettable conversation that lasted until sunrise.",
      "What started as friendship blossomed into something neither of us expected. From late-night phone calls to weekend adventures, every moment together felt effortless \u2014 like coming home.",
      "Three years, two apartments, one adopted cat, and countless memories later, we knew this was forever.",
    ],
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "10% 12% 10% 10%",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(3rem, 7vw, 5rem)",
          color: "var(--sb-gold)",
          lineHeight: 0.8,
          opacity: active ? 0.18 : 0,
          position: "absolute",
          top: "8%",
          left: "8%",
          transition: "opacity 1s 0.4s",
        }}
      >
        {story.heading[0]}
      </div>

      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 2.5vw, 1.6rem)",
          fontWeight: 400,
          fontStyle: "italic",
          color: "var(--sb-text-on-light)",
          marginBottom: "var(--sb-block-gap, 1.5rem)",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.8s 0.4s var(--sb-content-easing)",
        }}
      >
        {story.heading}
      </h3>

      <div
        style={{
          width: "30px",
          height: "1px",
          background: "var(--sb-gold)",
          marginBottom: "var(--sb-block-gap, 1.5rem)",
          opacity: active ? 1 : 0,
          transition: "opacity 0.5s 0.5s",
        }}
      />

      {story.paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.65rem, 1.15vw, 0.8rem)",
            lineHeight: 1.75,
            color: "var(--sb-text-on-light)",
            marginBottom: "1em",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(10px)",
            transition: `all 0.7s ${0.5 + i * 0.15}s var(--sb-content-easing)`,
          }}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SPREAD 2 — Timeline & Quote
   ═══════════════════════════════════════════════════ */

export function TimelineLeft({ data, active }: PageProps) {
  const events = data.timeline || [
    { date: "June 2021", label: "First Date", description: "Coffee that turned into dinner that turned into a walk that lasted hours" },
    { date: "Dec 2021", label: "First Trip Together", description: "A snowy weekend in the mountains that sealed the deal" },
    { date: "Aug 2022", label: "Moved In Together", description: "Two bookshelves became one (very overcrowded) bookshelf" },
    { date: "Feb 2025", label: "The Proposal", description: "Under a sky full of stars, one question changed everything" },
  ];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "10%",
        position: "relative",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--sb-gold)",
          marginBottom: "var(--sb-hero-gap, 2rem)",
          opacity: active ? 1 : 0,
          transition: "opacity 0.7s 0.3s",
        }}
      >
        Our Journey
      </p>

      <div style={{ position: "relative", paddingLeft: "24px" }}>
        <div
          style={{
            position: "absolute",
            left: "4px",
            top: "4px",
            bottom: "4px",
            width: "1px",
            background: "var(--sb-gold-muted)",
            transformOrigin: "top",
            transform: active ? "scaleY(1)" : "scaleY(0)",
            transition: "transform 1s 0.4s var(--sb-content-easing)",
          }}
        />

        {events.map((evt, i) => (
          <div
            key={i}
            style={{
              marginBottom: "var(--sb-block-gap, 1.5rem)",
              position: "relative",
              opacity: active ? 1 : 0,
              transform: active ? "translateX(0)" : "translateX(-15px)",
              transition: `all 0.7s ${0.5 + i * 0.15}s var(--sb-content-easing)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "-23px",
                top: "5px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--sb-gold)",
              }}
            />

            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.5rem, 0.8vw, 0.6rem)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--sb-gold)",
                marginBottom: "0.15rem",
              }}
            >
              {evt.date}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.7rem, 1.3vw, 0.95rem)",
                fontWeight: 500,
                color: "var(--sb-text-on-dark)",
                marginBottom: "0.25rem",
              }}
            >
              {evt.label}
            </p>
            {evt.description && (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
                  color: "var(--sb-text-on-dark-muted)",
                  lineHeight: 1.5,
                }}
              >
                {evt.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineRight({ data, active }: PageProps) {
  const brideQuote = data.quote || {
    text: "I knew right then that you were the one I\u2019d been waiting for. Every love story is beautiful, but ours is my favorite.",
    attribution: data.person1,
  };

  const groomQuote = data.groomQuote || {
    text: "She walked in and the rest of the world went quiet. I didn\u2019t know it yet, but I\u2019d just met my forever.",
    attribution: data.person2,
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "8% 10% 8% 8%",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(4rem, 12vw, 8rem)",
          color: "var(--sb-gold)",
          opacity: active ? 0.08 : 0,
          position: "absolute",
          top: "4%",
          right: "6%",
          lineHeight: 1,
          transition: "opacity 1s 0.4s",
          userSelect: "none",
        }}
      >
        &ldquo;
      </div>

      <blockquote
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.7rem, 1.4vw, 1rem)",
          fontStyle: "italic",
          fontWeight: 400,
          color: "var(--sb-text-on-light)",
          lineHeight: 1.6,
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.9s 0.45s var(--sb-content-easing)",
        }}
      >
        {brideQuote.text}
      </blockquote>

      {brideQuote.attribution && (
        <div
          style={{
            marginTop: "var(--sb-subhead-gap, 0.8rem)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.7s",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "1px",
              background: "var(--sb-gold)",
              marginBottom: "var(--sb-subhead-gap, 0.5rem)",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.45rem, 0.75vw, 0.55rem)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--sb-text-on-light-muted)",
            }}
          >
            &mdash; {brideQuote.attribution}
          </p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "1.2rem 0",
          opacity: active ? 1 : 0,
          transition: "opacity 0.6s 0.8s",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--sb-gold-muted)" }} />
        <div
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            border: "1px solid var(--sb-gold)",
            opacity: 0.5,
          }}
        />
        <div style={{ flex: 1, height: "1px", background: "var(--sb-gold-muted)" }} />
      </div>

      <blockquote
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.7rem, 1.4vw, 1rem)",
          fontStyle: "italic",
          fontWeight: 400,
          color: "var(--sb-text-on-light)",
          lineHeight: 1.6,
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.9s 0.85s var(--sb-content-easing)",
        }}
      >
        {groomQuote.text}
      </blockquote>

      {groomQuote.attribution && (
        <div
          style={{
            marginTop: "var(--sb-subhead-gap, 0.8rem)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 1.1s",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "1px",
              background: "var(--sb-gold)",
              marginBottom: "var(--sb-subhead-gap, 0.5rem)",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.45rem, 0.75vw, 0.55rem)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--sb-text-on-light-muted)",
            }}
          >
            &mdash; {groomQuote.attribution}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SPREAD 3 — Celebration Details
   ═══════════════════════════════════════════════════ */

export function DetailsLeft({ data, active }: PageProps) {
  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: data.venuePhotoUrl
            ? undefined
            : `
              radial-gradient(ellipse at 30% 30%, var(--sb-rose-muted) 0%, transparent 50%),
              radial-gradient(ellipse at 75% 60%, rgba(143, 168, 138, 0.25) 0%, transparent 45%),
              radial-gradient(ellipse at 50% 90%, rgba(201, 169, 110, 0.15) 0%, transparent 40%),
              linear-gradient(170deg, var(--sb-page-dark-2) 0%, var(--sb-page-dark) 100%)
            `,
          clipPath: active
            ? "polygon(0 0, 100% 0, 100% 100%, 0% 100%)"
            : "polygon(0 0, 0 0, 0 100%, 0% 100%)",
          transition: "clip-path 1.1s 0.25s var(--sb-content-easing)",
        }}
      >
        {data.venuePhotoUrl && (
          <Image
            src={data.venuePhotoUrl}
            alt={data.ceremonyVenue}
            fill
            style={{ objectFit: "cover" }}
            sizes="650px"
          />
        )}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(
            to top,
            rgba(11, 13, 24, 0.88) 0%,
            rgba(11, 13, 24, 0.5) 40%,
            rgba(11, 13, 24, 0.15) 70%,
            transparent 100%
          )`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8% 10%",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.5rem, 0.8vw, 0.6rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
            marginBottom: "var(--sb-subhead-gap, 0.8rem)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.5s",
          }}
        >
          The Ceremony
        </p>

        {data.ceremonyDate && (
          <p
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "clamp(0.7rem, 1.3vw, 0.95rem)",
              fontWeight: 400,
              color: "var(--sb-gold)",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(8px)",
              transition: "all 0.7s 0.55s var(--sb-content-easing)",
              marginBottom: "var(--sb-subhead-gap, 0.5rem)",
              lineHeight: 1.4,
            }}
          >
            {data.ceremonyDate}
          </p>
        )}

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.75rem, 1.5vw, 1.05rem)",
            fontWeight: 400,
            color: "var(--sb-text-on-dark)",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.7s 0.6s var(--sb-content-easing)",
            marginBottom: "0.3rem",
          }}
        >
          {data.ceremonyTime}
        </p>

        <div
          style={{
            width: "25px",
            height: "1px",
            background: "var(--sb-gold-muted)",
            margin: "0.6rem auto",
            opacity: active ? 1 : 0,
            transition: "opacity 0.5s 0.65s",
          }}
        />

        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.75rem, 1.4vw, 1rem)",
            fontWeight: 500,
            fontStyle: "italic",
            color: "var(--sb-text-on-dark)",
            marginBottom: "0.3rem",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.7s 0.7s var(--sb-content-easing)",
          }}
        >
          {data.ceremonyVenue}
        </h3>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.45rem, 0.8vw, 0.6rem)",
            color: "var(--sb-text-on-dark-muted)",
            lineHeight: 1.5,
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.8s",
          }}
        >
          {data.ceremonyAddress}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          top: "15px",
          right: "15px",
          width: "28px",
          height: "28px",
          borderTop: "1px solid var(--sb-gold)",
          borderRight: "1px solid var(--sb-gold)",
          opacity: active ? 0.5 : 0,
          transition: "opacity 0.8s 0.9s",
          zIndex: 3,
        }}
      />
    </div>
  );
}

export function DetailsRight({ data, active }: PageProps) {
  const hasReception = !!(data.receptionDate || data.receptionTime || data.receptionVenue);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "10%",
        textAlign: "center",
      }}
    >
      {hasReception ? (
        <>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--sb-gold-dark)",
              marginBottom: "var(--sb-block-gap, 1.5rem)",
              opacity: active ? 1 : 0,
              transition: "opacity 0.7s 0.3s",
            }}
          >
            The Reception
          </p>

          <div
            style={{
              width: "36px",
              height: "36px",
              border: "1.5px solid var(--sb-gold)",
              borderRadius: "50%",
              margin: "0 auto var(--sb-block-gap, 1.5rem)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: active ? 1 : 0,
              transform: active ? "scale(1)" : "scale(0.7)",
              transition: "all 0.8s 0.4s var(--sb-content-easing)",
              fontSize: "0.75rem",
            }}
          >
            &#10022;
          </div>

          {data.receptionDate && (
            <p
              style={{
                fontFamily: "var(--font-script)",
                fontSize: "clamp(0.75rem, 1.5vw, 1.05rem)",
                fontWeight: 400,
                color: "var(--sb-gold-dark)",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.7s 0.45s var(--sb-content-easing)",
                marginBottom: "var(--sb-subhead-gap, 0.5rem)",
                lineHeight: 1.4,
              }}
            >
              {data.receptionDate}
            </p>
          )}

          {data.receptionTime && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.85rem, 1.8vw, 1.2rem)",
                fontWeight: 400,
                color: "var(--sb-text-on-light)",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.7s 0.5s var(--sb-content-easing)",
                marginBottom: "var(--sb-subhead-gap, 0.5rem)",
              }}
            >
              {data.receptionTime}
            </p>
          )}

          <div
            style={{
              width: "30px",
              height: "1px",
              background: "var(--sb-gold-muted)",
              margin: "1rem auto",
              opacity: active ? 1 : 0,
              transition: "opacity 0.5s 0.55s",
            }}
          />

          {data.receptionVenue && (
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.85rem, 1.6vw, 1.1rem)",
                fontWeight: 500,
                fontStyle: "italic",
                color: "var(--sb-text-on-light)",
                marginBottom: "var(--sb-subhead-gap, 0.5rem)",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.7s 0.6s var(--sb-content-easing)",
              }}
            >
              {data.receptionVenue}
            </h3>
          )}

          {data.receptionAddress && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
                color: "var(--sb-text-on-light-muted)",
                lineHeight: 1.6,
                opacity: active ? 1 : 0,
                transition: "opacity 0.7s 0.7s",
              }}
            >
              {data.receptionAddress}
            </p>
          )}
        </>
      ) : (
        /* Empty reception — decorative placeholder */
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "1.5px solid var(--sb-gold-muted)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: active ? 0.4 : 0,
            transition: "opacity 0.8s 0.4s",
            fontSize: "0.75rem",
            color: "var(--sb-gold-muted)",
          }}
        >
          &#10022;
        </div>
      )}

      {data.dressCode && (
        <div
          style={{
            marginTop: "var(--sb-hero-gap, 2rem)",
            padding: "0.6rem 1.2rem",
            border: "1px solid var(--sb-gold-muted)",
            borderRadius: "2px",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.8s",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.5rem, 0.8vw, 0.6rem)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--sb-gold-dark)",
            }}
          >
            {data.dressCode}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SPREAD 4 — RSVP
   ═══════════════════════════════════════════════════ */

export function RSVPLeft({ data, active }: PageProps) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "10%",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "var(--sb-gold-muted)",
          filter: "blur(60px)",
          opacity: active ? 0.4 : 0,
          transition: "opacity 1.5s 0.3s",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.55rem, 0.9vw, 0.65rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
            marginBottom: "var(--sb-block-gap, 1.5rem)",
            opacity: active ? 1 : 0,
            transition: "opacity 0.7s 0.3s",
          }}
        >
          Your Presence
        </p>

        <h2
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
            fontWeight: 400,
            color: "var(--sb-gold)",
            lineHeight: 1.2,
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(15px)",
            transition: "all 0.9s 0.4s var(--sb-content-easing)",
          }}
        >
          Kindly Respond
        </h2>

        <div
          style={{
            width: active ? "50px" : "0px",
            height: "1px",
            background: "var(--sb-gold)",
            margin: "var(--sb-block-gap, 1.5rem) auto",
            transition: "width 0.8s 0.6s var(--sb-content-easing)",
          }}
        />

        {data.rsvpDeadline && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.55rem, 0.9vw, 0.7rem)",
              fontStyle: "italic",
              color: "var(--sb-text-on-dark-muted)",
              opacity: active ? 1 : 0,
              transition: "opacity 0.7s 0.7s",
            }}
          >
            We kindly ask for your reply by
            <br />
            <span
              style={{
                color: "var(--sb-text-on-dark)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.6rem, 1vw, 0.75rem)",
              }}
            >
              {data.rsvpDeadline}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function RSVPRight({ data, active }: PageProps) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "10%",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "1px solid var(--sb-gold-muted)",
          borderRadius: "2px",
          opacity: active ? 0.5 : 0,
          transition: "opacity 0.8s 0.3s",
          pointerEvents: "none",
        }}
      />

      <p
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(0.7rem, 1.4vw, 1rem)",
          color: "var(--sb-text-on-light)",
          lineHeight: 1.7,
          maxWidth: "260px",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.8s 0.4s var(--sb-content-easing)",
          marginBottom: "var(--sb-hero-gap, 2rem)",
        }}
      >
        We can&apos;t wait to celebrate this special day with you
      </p>

      {data.rsvpUrl && (
        <Link
          href={data.rsvpUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.7rem 1.8rem",
            background: "var(--sb-gold)",
            color: "var(--sb-page-dark)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.55rem, 0.9vw, 0.7rem)",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            borderRadius: "2px",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
            transition: "all 0.7s 0.6s var(--sb-content-easing)",
            pointerEvents: active ? "auto" : "none",
          }}
        >
          Respond Now
          <span style={{ fontSize: "0.8em" }}>&rarr;</span>
        </Link>
      )}

      <p
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(1rem, 2.5vw, 1.6rem)",
          color: "var(--sb-gold-dark)",
          marginTop: "var(--sb-hero-gap, 2.5rem)",
          opacity: active ? 0.5 : 0,
          transition: "opacity 0.8s 0.8s",
        }}
      >
        {data.person1} & {data.person2}
      </p>
    </div>
  );
}
