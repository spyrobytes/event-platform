import type { EventPageConfigV1 } from "@/schemas/event-page";

/**
 * Return a new `EventPageConfigV1` with every reference to the given asset ID
 * stripped. Used by both the DELETE media API route (server-side authoritative
 * cleanup) and the page-editor client (instant visual feedback).
 *
 * Keeping this in one place guarantees server and client produce identical
 * results. If a new section type adds an asset reference, update this function
 * and both call sites benefit automatically.
 *
 * Reference sites covered:
 *   - hero.heroImageAssetId
 *   - hero.couplePhotoAssetId
 *   - sections[gallery].assetIds[]       (legacy flat array)
 *   - sections[gallery].items[].assetId
 *   - sections[speakers].items[].imageAssetId
 *   - sections[sponsors].items[].logoAssetId
 *   - sections[story].imageAssetId        (split layout)
 *   - sections[story].milestones[].imageAssetId  (timeline layout)
 *   - sections[weddingParty].members[].imageAssetId
 *   - sections[registry].items[].logoAssetId
 *   - sections[registry].items[].imageAssetId
 *
 * The input is never mutated.
 */
export function stripAssetRefsFromConfig(
  config: EventPageConfigV1,
  assetId: string
): EventPageConfigV1 {
  // Hero: clear either hero image or couple photo if they match
  const hero = {
    ...config.hero,
    heroImageAssetId:
      config.hero.heroImageAssetId === assetId ? undefined : config.hero.heroImageAssetId,
    couplePhotoAssetId:
      config.hero.couplePhotoAssetId === assetId ? undefined : config.hero.couplePhotoAssetId,
  };

  const sections = config.sections.map((section) => {
    switch (section.type) {
      case "gallery": {
        const newAssetIds = (section.data.assetIds || []).filter((id) => id !== assetId);
        const newItems = (section.data.items || []).filter((item) => item.assetId !== assetId);
        return {
          ...section,
          data: { ...section.data, assetIds: newAssetIds, items: newItems },
        };
      }

      case "speakers": {
        const newItems = section.data.items.map((item) =>
          item.imageAssetId === assetId ? { ...item, imageAssetId: undefined } : item
        );
        return { ...section, data: { ...section.data, items: newItems } };
      }

      case "sponsors": {
        const newItems = section.data.items.map((item) =>
          item.logoAssetId === assetId ? { ...item, logoAssetId: undefined } : item
        );
        return { ...section, data: { ...section.data, items: newItems } };
      }

      case "story": {
        const newMilestones = (section.data.milestones || []).map((m) =>
          m.imageAssetId === assetId ? { ...m, imageAssetId: undefined } : m
        );
        return {
          ...section,
          data: {
            ...section.data,
            imageAssetId:
              section.data.imageAssetId === assetId ? undefined : section.data.imageAssetId,
            milestones: newMilestones,
          },
        };
      }

      case "weddingParty": {
        const newMembers = section.data.members.map((m) =>
          m.imageAssetId === assetId ? { ...m, imageAssetId: undefined } : m
        );
        return { ...section, data: { ...section.data, members: newMembers } };
      }

      case "registry": {
        const newItems = section.data.items.map((item) => {
          const logoCleared =
            item.logoAssetId === assetId ? { ...item, logoAssetId: undefined } : item;
          return logoCleared.imageAssetId === assetId
            ? { ...logoCleared, imageAssetId: undefined }
            : logoCleared;
        });
        return { ...section, data: { ...section.data, items: newItems } };
      }

      default:
        return section;
    }
  });

  return { ...config, hero, sections };
}
