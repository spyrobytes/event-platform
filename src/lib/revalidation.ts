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
