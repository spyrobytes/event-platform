import { cn } from "@/lib/utils";
import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type HeroSectionProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  primaryColor: string;
};

/**
 * Party Hero Section
 * A vibrant, celebratory hero with bold typography and festive styling.
 */
export function HeroSection({ config, heroAsset, primaryColor }: HeroSectionProps) {
  const overlayClasses = {
    none: "",
    soft: "bg-gradient-to-b from-black/20 via-transparent to-black/40",
    strong: "bg-gradient-to-b from-black/40 via-black/20 to-black/60",
  };

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
  };

  return (
    <section
      aria-label="Event hero"
      className="relative flex min-h-[55vh] items-center justify-center overflow-hidden md:min-h-[65vh]"
    >
      {/* Background Image or Gradient */}
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
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 30%, ${primaryColor}aa 70%, ${primaryColor}77 100%)`,
          }}
        />
      )}

      {/* Decorative circles pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div
          className="absolute -left-20 -top-20 h-64 w-64 rounded-full"
          style={{ backgroundColor: "white" }}
        />
        <div
          className="absolute -right-10 top-1/4 h-48 w-48 rounded-full"
          style={{ backgroundColor: "white" }}
        />
        <div
          className="absolute bottom-10 left-1/4 h-32 w-32 rounded-full"
          style={{ backgroundColor: "white" }}
        />
        <div
          className="absolute -bottom-16 right-1/3 h-56 w-56 rounded-full"
          style={{ backgroundColor: "white" }}
        />
      </div>

      {/* Overlay */}
      {config.overlay !== "none" && (
        <div className={cn("absolute inset-0", overlayClasses[config.overlay])} />
      )}

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-4xl flex-col px-6 py-16",
          alignClasses[config.align],
          config.align === "center" && "mx-auto"
        )}
      >
        {/* Decorative emoji/icon */}
        <div className="mb-4 text-5xl md:text-6xl" role="img" aria-label="Celebration">
          🎉
        </div>

        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
          {config.title}
        </h1>

        {config.subtitle && (
          <p className="max-w-2xl text-lg font-medium text-white/90 drop-shadow md:text-xl">
            {config.subtitle}
          </p>
        )}
      </div>

      {/* Curved bottom edge */}
      <div className="absolute -bottom-1 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          className="h-16 w-full md:h-24"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            className="text-background"
            d="M0,64 C480,120 960,0 1440,64 L1440,120 L0,120 Z"
          />
        </svg>
      </div>
    </section>
  );
}
