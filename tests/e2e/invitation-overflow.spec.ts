import { test, expect, type Page } from "@playwright/test";

/**
 * Overflow regression tests for the animated invitation cards.
 *
 * Uses the /test/invitation-preview harness (no database) with
 * `preset=max` — every field at its CONTENT_LIMITS maximum, the content
 * combination that used to push the RSVP CTA outside the fixed card face
 * (unreachable by scrolling). The useFitScale backstop plus each template's
 * density cascade must keep the CTA inside every overflow-clipping ancestor
 * at phone and short-desktop viewports.
 *
 * Run with: npx playwright test invitation-overflow.spec.ts
 */

const CARD_TEMPLATES = [
  "SPLIT_REVEAL",
  "GOLDEN_CARD_REVEAL",
  "FLIP_FLAP_REVEAL",
] as const;

const VIEWPORTS = [
  { name: "narrow phone", width: 320, height: 667 },
  { name: "phone", width: 375, height: 667 },
  { name: "short desktop", width: 1366, height: 768 },
] as const;

async function gotoPreview(page: Page, templateId: string, query: string) {
  await page.goto(`/test/invitation-preview/${templateId}?${query}`);
  await page.waitForLoadState("networkidle");
  // Wait until geometry settles instead of a fixed timeout: the entrance
  // animation (1s) and the --fit-scale transform transition (0.6s after a
  // 0.8s delay) both move the content, and their start is gated on rAF +
  // font loading. Some card animations are infinite (seal pulse, hint
  // bounce), so "no running animations" would never resolve — track the
  // probe element's bounding rect and require ~30 stable rAF frames.
  await page.waitForFunction(
    () => {
      const visible = (el: Element) => {
        const st = getComputedStyle(el);
        return (
          st.visibility !== "hidden" &&
          st.display !== "none" &&
          parseFloat(st.opacity) > 0.05
        );
      };
      const probe =
        Array.from(document.querySelectorAll("a, button"))
          .filter(visible)
          .find((el) => /rsvp|respond/i.test(el.textContent || "")) ??
        document.querySelector('[class*="book"]');
      if (!probe) return false;
      const rect = probe.getBoundingClientRect();
      const key = `${rect.top}|${rect.bottom}|${rect.left}|${rect.right}`;
      const w = window as unknown as { __rectKey?: string; __stable?: number };
      if (w.__rectKey === key) {
        w.__stable = (w.__stable ?? 0) + 1;
      } else {
        w.__rectKey = key;
        w.__stable = 0;
      }
      // Must outlast the longest quiet window in the settle sequence: the
      // fit-scale transition waits out a 0.8s transition-delay (~48 rAF
      // frames of stillness) before it starts moving the content.
      return (w.__stable ?? 0) > 80;
    },
    undefined,
    { polling: "raf", timeout: 20000 },
  );
}

/**
 * The RSVP CTA must exist, sit inside every overflow-clipping ancestor
 * (±2px), and the page must not scroll horizontally.
 */
async function expectRsvpUnclipped(page: Page) {
  const result = await page.evaluate(() => {
    const visible = (el: Element) => {
      const st = getComputedStyle(el);
      return (
        st.visibility !== "hidden" &&
        st.display !== "none" &&
        parseFloat(st.opacity) > 0.05
      );
    };
    const rsvp = Array.from(document.querySelectorAll("a, button"))
      .filter(visible)
      .find((el) => /rsvp|respond/i.test(el.textContent || ""));
    if (!rsvp) return { found: false as const };

    const rect = rsvp.getBoundingClientRect();
    let clippedBy: string | null = null;
    let ancestor = rsvp.parentElement;
    while (ancestor && ancestor !== document.documentElement) {
      const st = getComputedStyle(ancestor);
      if (["hidden", "clip"].includes(st.overflowY)) {
        const box = ancestor.getBoundingClientRect();
        if (rect.bottom > box.bottom + 2 || rect.top < box.top - 2) {
          clippedBy = ancestor.className.toString();
          break;
        }
      }
      ancestor = ancestor.parentElement;
    }
    return {
      found: true as const,
      clippedBy,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });

  expect(result.found, "RSVP CTA should render").toBe(true);
  if (result.found) {
    expect(result.clippedBy, "RSVP CTA should not be clipped").toBeNull();
    expect(result.horizontalOverflow, "page should not scroll horizontally").toBe(0);
  }
}

test.describe("Animated invitation cards — max-content overflow", () => {
  for (const templateId of CARD_TEMPLATES) {
    for (const viewport of VIEWPORTS) {
      test(`${templateId} keeps RSVP visible at max content (${viewport.name})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await gotoPreview(page, templateId, "preset=max&open=1");
        await expectRsvpUnclipped(page);
      });
    }
  }

  test("WEDDING_STORYBOOK cover keeps the traditional header inside the page at max content", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await gotoPreview(page, "WEDDING_STORYBOOK", "preset=max&open=1");

    // The regression: the cover page centered its overflow, clipping the
    // family-names header off the top of the book page.
    const result = await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll("p")).find((el) =>
        /the families of/i.test(el.textContent || ""),
      );
      const book = document.querySelector('[class*="book"]');
      if (!label || !book) return null;
      return {
        labelTop: label.getBoundingClientRect().top,
        bookTop: book.getBoundingClientRect().top,
      };
    });

    expect(result, "cover header and book should render").not.toBeNull();
    if (result) {
      expect(result.labelTop).toBeGreaterThanOrEqual(result.bookTop - 2);
    }
  });

  test("baseline content does not engage the fit-scale backstop", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoPreview(page, "FLIP_FLAP_REVEAL", "preset=baseline&open=1");

    const fitScale = await page.evaluate(() => {
      const inner = document.querySelector('[class*="contentInner"]');
      return inner ? getComputedStyle(inner).getPropertyValue("--fit-scale") : null;
    });
    // Empty string = custom property unset = content rendered at natural size.
    expect(fitScale).toBe("");
  });
});
