import { revalidatePath } from "next/cache";

/**
 * Revalidate the public event page
 * Call this when event page config is updated or published
 */
export async function revalidateEventPage(slug: string): Promise<void> {
  try {
    // Revalidate the public event page
    revalidatePath(`/e/${slug}`);
  } catch (error) {
    // Log but don't throw - revalidation failure shouldn't break the main operation
    console.error(`Failed to revalidate event page /e/${slug}:`, error);
  }
}

/**
 * Revalidate multiple event pages
 */
export async function revalidateEventPages(slugs: string[]): Promise<void> {
  await Promise.all(slugs.map((slug) => revalidateEventPage(slug)));
}

/**
 * Revalidate both the public event page and the dedicated post-event
 * gallery sub-page. Call this from gallery publish/unpublish/delete
 * handlers — the hero CTA and teaser on /e/[slug] depend on gallery state,
 * and /e/[slug]/gallery is its own ISR surface.
 */
export async function revalidateEventAndGallery(slug: string): Promise<void> {
  try {
    revalidatePath(`/e/${slug}`);
    revalidatePath(`/e/${slug}/gallery`);
  } catch (error) {
    console.error(
      `Failed to revalidate gallery surfaces for /e/${slug}:`,
      error,
    );
  }
}
