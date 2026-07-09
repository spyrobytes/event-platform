import Link from "next/link";
import { cn } from "@/lib/utils";
import { DEMO_INVITATIONS_PATH } from "@/lib/demo-templates";
import styles from "../DemoBar.module.css";

export type InvitationCardOption = {
  id: string;
  label: string;
};

type Props = {
  cards: readonly InvitationCardOption[];
  activeId: string;
  /** Card shown when no `?card=` param is present — links canonical. */
  defaultId: string;
};

function cardHref(id: string, defaultId: string) {
  return id === defaultId
    ? DEMO_INVITATIONS_PATH
    : `${DEMO_INVITATIONS_PATH}?card=${id}`;
}

/**
 * Floating chrome for the animated-invitations demo page. Same visual
 * language as DemoBar (shared module), but the middle strip is labeled
 * card-switcher pills instead of color swatches — switching is URL state
 * (`?card=`), so pills are plain prefetched links.
 */
export function InvitationDemoBar({ cards, activeId, defaultId }: Props) {
  return (
    <div className={styles.bar} data-testid="demo-bar">
      <Link href="/#templates" className={styles.back} aria-label="Back to all templates">
        <span aria-hidden="true">←</span>
        <span className={styles.backLabel}>Templates</span>
      </Link>

      <ul className={styles.cards} aria-label="Invitation cards">
        {cards.map((c) => (
          <li key={c.id}>
            <Link
              href={cardHref(c.id, defaultId)}
              replace
              scroll={false}
              aria-current={c.id === activeId ? "true" : undefined}
              className={cn(
                styles.cardPill,
                c.id === activeId && styles.cardPillActive,
              )}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/join" className={styles.cta}>
        Use this template
      </Link>
    </div>
  );
}
