"use client";

import { useState } from "react";
import Image from "next/image";
import { Section } from "../ui/Section";
import { getAllV2Variants, type V2VariantConfig, type V2VariantCategory } from "@/components/templates/wedding-v2/variants";

const CATEGORIES: { id: V2VariantCategory | "all"; label: string }[] = [
  { id: "all", label: "All Designs" },
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "romantic", label: "Romantic" },
  { id: "earthy", label: "Earthy" },
  { id: "bold", label: "Bold" },
];

function PaletteDots({ variant }: { variant: V2VariantConfig }) {
  return (
    <div className="flex gap-1.5">
      {variant.accentSwatches.slice(0, 5).map((s, i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: s.hex }}
        />
      ))}
    </div>
  );
}

export function VariantShowcase() {
  const [activeCategory, setActiveCategory] = useState<V2VariantCategory | "all">("all");
  const variants = getAllV2Variants();

  const filtered = activeCategory === "all"
    ? variants
    : variants.filter((v) => v.category === activeCategory);

  return (
    <Section className="bg-neutral-50">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold tracking-widest uppercase text-neutral-500 mb-3">
          Premium Designs
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          12 curated wedding designs
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-600">
          Each design is a complete visual identity — colors, typography, and decorative
          elements crafted to match your celebration style.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === id
                ? "bg-neutral-900 text-white shadow-md"
                : "bg-white text-neutral-600 hover:bg-neutral-100 ring-1 ring-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Variant cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((variant) => {
          const bgColor = variant.palette.bg || "#f8f5f0";
          const textColor = variant.palette.text || "#3d3830";
          const accentColor = variant.accentSwatches[0]?.hex || "#7a8c72";

          return (
            <div
              key={variant.id}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80 transition-all hover:shadow-lg hover:ring-neutral-300"
            >
              {/* Preview area */}
              <div
                className="relative h-48 overflow-hidden"
                style={{ backgroundColor: bgColor }}
              >
                {variant.thumbnail ? (
                  <Image
                    src={variant.thumbnail}
                    alt={`${variant.displayName} design preview`}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <>
                    {/* Accent bar */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{ backgroundColor: accentColor }}
                    />
                    {/* Placeholder preview text */}
                    <div className="flex h-full items-center justify-center px-6">
                      <div className="text-center">
                        <p
                          className="text-2xl font-serif italic"
                          style={{ color: textColor }}
                        >
                          A & B
                        </p>
                        <p
                          className="mt-1 text-xs tracking-widest uppercase opacity-60"
                          style={{ color: textColor }}
                        >
                          June 14, 2025
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold text-neutral-900">
                    {variant.displayName}
                  </h3>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500 capitalize">
                    {variant.category}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mb-3">
                  {variant.description}
                </p>
                <PaletteDots variant={variant} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
