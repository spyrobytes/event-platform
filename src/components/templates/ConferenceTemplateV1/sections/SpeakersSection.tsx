"use client";

import Image from "next/image";
import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";
import type { SpeakerItem, SpeakerLink } from "@/schemas/event-page";

type SpeakersSectionProps = {
  data: {
    heading: string;
    description?: string;
    items: SpeakerItem[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

function SocialIcon({ type }: { type: SpeakerLink["type"] }) {
  switch (type) {
    case "website":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      );
    case "twitter":
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
  }
}

/**
 * Speakers Section for Conference template
 * Professional card layout with badges
 */
export function SpeakersSection({ data, assets, primaryColor }: SpeakersSectionProps) {
  const { heading = "Speakers", description, items } = data;

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Speakers" className="bg-muted/30">
      <div className="mx-auto max-w-2xl text-center">
        <div
          className="mb-4 inline-block rounded-full px-4 py-1 text-sm font-medium"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          Featured Speakers
        </div>
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((speaker, index) => {
          const speakerImage = speaker.imageAssetId
            ? assets.find((a) => a.id === speaker.imageAssetId)
            : null;

          return (
            <div
              key={index}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg"
            >
              {/* Photo Header */}
              <div className="relative h-48 overflow-hidden bg-muted">
                {speakerImage?.publicUrl ? (
                  <Image
                    src={speakerImage.publicUrl}
                    alt={speaker.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-5xl font-light text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {speaker.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="text-lg font-bold">{speaker.name}</h3>
                  {speaker.role && (
                    <p className="text-sm opacity-90">{speaker.role}</p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {speaker.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {speaker.bio}
                  </p>
                )}

                {/* Social Links */}
                {speaker.links && speaker.links.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {speaker.links.map((link, linkIndex) => (
                      <a
                        key={linkIndex}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        aria-label={`${speaker.name}'s ${link.type}`}
                      >
                        <SocialIcon type={link.type} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
