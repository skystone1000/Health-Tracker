/**
 * Convention-based public paths for illustrations. Images are populated by hand
 * under `public/` and served from the site root. Filenames match the entity id
 * exactly, so no schema field is needed — see `docs/plan_4_yoga_images.md`.
 */

/** Asana illustration, e.g. asanaImageUrl("tadasana") → /images/asanas/tadasana.webp */
export const asanaImageUrl = (id: string): string => `/images/asanas/${id}.webp`;
