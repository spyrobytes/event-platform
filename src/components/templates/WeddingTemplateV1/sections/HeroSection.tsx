import { cn } from "@/lib/utils";
import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type HeroSectionProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  primaryColor: string;
};

export function HeroSection({ config, heroAsset, primaryColor }: HeroSectionProps) {
  const overlayClasses = {
    none: "",
    soft: "bg-black/30",
    strong: "bg-black/60",
  };

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
  };

  return (
    <section
      aria-label="Event hero"
      className="relative flex min-h-[60vh] items-center justify-center overflow-hidden md:min-h-[70vh]"
    >
      {/* Background Image */}
      {heroAsset?.publicUrl ? (
        <img
          src={heroAsset.publicUrl}
          alt={heroAsset.alt || config.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%)`,
          }}
        />
      )}

      {/* Overlay */}
      {config.overlay !== "none" && (
        <div className={cn("absolute inset-0", overlayClasses[config.overlay])} />
      )}

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-4xl flex-col px-4 py-16",
          alignClasses[config.align]
        )}
      >
        <h1
          className="mb-4 text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl"
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
        >
          {config.title}
        </h1>
        {config.subtitle && (
          <p
            className="max-w-2xl text-lg text-white/90 drop-shadow md:text-xl"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
          >
            {config.subtitle}
          </p>
        )}
      </div>

      {/* Decorative gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
