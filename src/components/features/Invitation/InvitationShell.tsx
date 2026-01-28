"use client";

import { cn } from "@/lib/utils";
import {
  getInvitationStyleObject,
  type ThemeId,
  type TypographyPair,
} from "@/lib/invitation-themes";

type InvitationShellProps = {
  /** Theme ID for color palette */
  themeId: ThemeId;
  /** Typography pair for fonts */
  typographyPair: TypographyPair;
  /** Text direction for RTL support */
  textDirection?: "ltr" | "rtl";
  /** Additional CSS classes */
  className?: string;
  /** Child content */
  children: React.ReactNode;
};

/**
 * InvitationShell provides the themed container for invitation experiences.
 *
 * Applies theme tokens inline to prevent flash of unstyled content (FOUC).
 * Handles background, typography, and RTL support.
 *
 * @example
 * ```tsx
 * <InvitationShell themeId="ivory" typographyPair="classic">
 *   <EnvelopeReveal>
 *     <InvitationCard {...data} />
 *   </EnvelopeReveal>
 * </InvitationShell>
 * ```
 */
export function InvitationShell({
  themeId,
  typographyPair,
  textDirection = "ltr",
  className,
  children,
}: InvitationShellProps) {
  const styleObject = getInvitationStyleObject(themeId, typographyPair);

  return (
    <div
      className={cn(
        "invitation-shell",
        "min-h-screen w-full",
        "bg-[var(--inv-paper-bg)]",
        "text-[var(--inv-text-primary)]",
        "font-[var(--inv-font-body)]",
        "antialiased",
        className
      )}
      style={styleObject}
      dir={textDirection}
    >
      {/* Paper texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[var(--inv-grain-opacity)]"
        style={{
          backgroundImage: "var(--inv-paper-texture)",
          backgroundRepeat: "repeat",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
