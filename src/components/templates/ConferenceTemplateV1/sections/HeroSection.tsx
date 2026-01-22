import { cn } from "@/lib/utils";
import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type HeroSectionProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  primaryColor: string;
};

/**
 * Conference Hero Section
 * A professional, modern hero with strong typography and geometric styling.
 */
export function HeroSection({ config, heroAsset, primaryColor }: HeroSectionProps) {
  const overlayClasses = {
    none: "",
    soft: "bg-gradient-to-r from-black/50 to-black/30",
    strong: "bg-gradient-to-r from-black/80 to-black/60",
  };

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
  };

  return (
    <section
      aria-label="Conference hero"
      className="relative flex min-h-[50vh] items-center overflow-hidden bg-slate-900 md:min-h-[60vh]"
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
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 50%, #1e293b 100%)`,
          }}
        />
      )}

      {/* Geometric overlay pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Overlay */}
      {config.overlay !== "none" && (
        <div className={cn("absolute inset-0", overlayClasses[config.overlay])} />
      )}

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-5xl flex-col px-6 py-16 md:px-8",
          alignClasses[config.align],
          config.align === "center" ? "mx-auto" : "ml-8 md:ml-16"
        )}
      >
        {/* Conference badge */}
        <div
          className="mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          style={{ backgroundColor: `${primaryColor}30`, color: "white" }}
        >
          <span
            className="mr-2 h-2 w-2 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
          Conference
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          {config.title}
        </h1>

        {config.subtitle && (
          <p className="max-w-2xl text-lg text-white/80 md:text-xl">
            {config.subtitle}
          </p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: primaryColor }}
      />
    </section>
  );
}
