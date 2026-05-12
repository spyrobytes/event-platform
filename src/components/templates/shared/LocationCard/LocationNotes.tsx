import type { MapSection } from "@/schemas/event-page";
import { cn } from "@/lib/utils";

type LocationNotesProps = {
  data: MapSection["data"];
  className?: string;
};

const NOTE_LABELS: Record<"parkingNote" | "entranceNote" | "accessibilityNote", string> = {
  parkingNote: "Parking",
  entranceNote: "Entrance",
  accessibilityNote: "Accessibility",
};

/**
 * Renders any guest-facing notes (parking, entrance, accessibility) present
 * on the map section. Renders nothing if all three are empty — keeps the
 * fallback hierarchy clean (no labeled-empty blocks polluting the UI).
 *
 * Styling stays neutral: a `<dl>` with small muted labels and standard body
 * text. Each template can override via `className` to scope ancestor styles
 * if needed (Conference's sidebar typography, Party's playful tone). The
 * note content itself stays plain to keep the guest-readability bar high.
 */
export function LocationNotes({ data, className }: LocationNotesProps) {
  const entries = (
    ["parkingNote", "entranceNote", "accessibilityNote"] as const
  )
    .map((field) => ({ field, value: data[field]?.trim() }))
    .filter((entry): entry is { field: typeof entry.field; value: string } => Boolean(entry.value));

  if (entries.length === 0) return null;

  return (
    <dl className={cn("space-y-3", className)}>
      {entries.map(({ field, value }) => (
        <div key={field}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {NOTE_LABELS[field]}
          </dt>
          <dd className="mt-1 text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
