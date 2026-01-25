import { cn } from "@/lib/utils";

type EditorMockupVariant =
  | "template-selector"
  | "section-list"
  | "gallery-modes"
  | "media-library"
  | "theme-editor"
  | "hero-section";

type EditorMockupProps = {
  variant: EditorMockupVariant;
  className?: string;
};

function MockupWindow({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        {title && (
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {title}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TemplateSelector() {
  const templates = [
    { name: "Wedding", icon: "💒", color: "bg-pink-100 dark:bg-pink-900/30" },
    { name: "Conference", icon: "🎤", color: "bg-blue-100 dark:bg-blue-900/30" },
    { name: "Party", icon: "🎉", color: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <MockupWindow title="Choose Template">
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template, index) => (
          <div
            key={template.name}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
              index === 0
                ? "border-primary ring-2 ring-primary/20"
                : "border-transparent hover:border-muted-foreground/20"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg text-2xl",
                template.color
              )}
            >
              {template.icon}
            </div>
            <span className="text-xs font-medium">{template.name}</span>
          </div>
        ))}
      </div>
    </MockupWindow>
  );
}

function SectionList() {
  const sections = [
    { name: "Hero", enabled: true },
    { name: "Details", enabled: true },
    { name: "Schedule", enabled: true },
    { name: "Gallery", enabled: false },
    { name: "RSVP", enabled: true },
  ];

  return (
    <MockupWindow title="Sections">
      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.name}
            className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="h-1 w-3 rounded-full bg-muted-foreground/40" />
                <div className="h-1 w-3 rounded-full bg-muted-foreground/40" />
              </div>
              <span className="text-sm font-medium">{section.name}</span>
            </div>
            <div
              className={cn(
                "h-5 w-9 rounded-full transition-colors",
                section.enabled ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 rounded-full bg-white shadow transition-transform",
                  section.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </MockupWindow>
  );
}

function GalleryModes() {
  const modes = [
    { name: "Grid", icon: "▦" },
    { name: "Carousel", icon: "◀▶" },
    { name: "Masonry", icon: "▤" },
    { name: "Slideshow", icon: "▶" },
  ];

  return (
    <MockupWindow title="Display Mode">
      <div className="grid grid-cols-4 gap-2">
        {modes.map((mode, index) => (
          <div
            key={mode.name}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
              index === 0
                ? "border-primary bg-primary/10"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <span className="text-lg font-mono">{mode.icon}</span>
            <span className="text-xs">{mode.name}</span>
          </div>
        ))}
      </div>
    </MockupWindow>
  );
}

function MediaLibrary() {
  return (
    <MockupWindow title="Media Library">
      <div className="space-y-3">
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-6">
          <div className="text-center">
            <span className="text-2xl">📤</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Drop images here
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-lg",
                i === 1 ? "bg-pink-200 dark:bg-pink-800" : "",
                i === 2 ? "bg-blue-200 dark:bg-blue-800" : "",
                i === 3 ? "bg-green-200 dark:bg-green-800" : "",
                i === 4 ? "bg-purple-200 dark:bg-purple-800" : ""
              )}
            />
          ))}
        </div>
      </div>
    </MockupWindow>
  );
}

function ThemeEditor() {
  return (
    <MockupWindow title="Theme">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Primary Color
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-mono">
              #22c55e
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Font Pair
          </label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {["Modern", "Classic", "Serif"].map((font, i) => (
              <div
                key={font}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-center text-xs",
                  i === 0 ? "border-primary bg-primary/10" : "border-muted"
                )}
              >
                {font}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function HeroSection() {
  return (
    <MockupWindow title="Hero Section">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            Sarah & Michael&apos;s Wedding
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Subtitle
          </label>
          <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Join us for our special day
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Background Image
          </label>
          <div className="mt-1 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900">
            <span className="text-2xl">🖼️</span>
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

export function EditorMockup({ variant, className }: EditorMockupProps) {
  return (
    <div className={className}>
      {variant === "template-selector" && <TemplateSelector />}
      {variant === "section-list" && <SectionList />}
      {variant === "gallery-modes" && <GalleryModes />}
      {variant === "media-library" && <MediaLibrary />}
      {variant === "theme-editor" && <ThemeEditor />}
      {variant === "hero-section" && <HeroSection />}
    </div>
  );
}
