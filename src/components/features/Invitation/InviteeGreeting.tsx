import { cn } from "@/lib/utils";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";

type InviteeGreetingProps = {
  /** Guest name to display */
  name?: string;
  /** Salutation prefix (default: "Dear") */
  salutation?: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Personalized greeting for the invitee.
 *
 * Displays "Dear [Name]," or just "Dear Guest," if no name provided.
 * Uses script font for an elegant touch.
 *
 * @example
 * ```tsx
 * <InviteeGreeting name="Aunt Maria" />
 * // Renders: "Dear Aunt Maria,"
 *
 * <InviteeGreeting name="Sarah" salutation="Hello" />
 * // Renders: "Hello Sarah,"
 * ```
 */
export function InviteeGreeting({
  name,
  salutation = "Dear",
  className,
}: InviteeGreetingProps) {
  // Sanitize and truncate name to prevent layout issues
  const displayName = name
    ? truncateWithEllipsis(name.trim(), CONTENT_LIMITS.inviteeDisplayName.max)
    : "Guest";

  const displaySalutation = salutation
    ? truncateWithEllipsis(salutation.trim(), CONTENT_LIMITS.salutation.max)
    : "Dear";

  return (
    <p
      className={cn(
        "font-[var(--inv-font-script)]",
        "text-2xl md:text-3xl",
        "text-[var(--inv-text-primary)]",
        "mb-4",
        className
      )}
    >
      {displaySalutation} {displayName},
    </p>
  );
}
