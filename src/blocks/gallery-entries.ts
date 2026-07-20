import type { GalleryEntry } from './gallery-types'

import { blockComponents } from './blockComponents'
import { galleryBlocks } from './gallery'
import { galleryHeros } from '../heros/gallery'

/**
 * Normalized, flat list of every gallery entry — layout blocks and heros unified
 * into one `GalleryEntry` shape so the catalog index and the per-entry detail
 * route can treat them the same way.
 *
 * Blocks are derived from the render registry (`blockComponents`) unioned with
 * curated `galleryBlocks`: a block registered but missing curated data still
 * surfaces as a variant-less stub, so a newly-registered block never silently
 * disappears from the catalog. Heros come from `galleryHeros`.
 *
 * Render-side only: imports the render registry, so it must never be pulled into
 * the Payload config graph (see `blockComponents.ts`).
 */

/** URL-safe id for an entry: `${kind}.${renderKey}` (e.g. "block.cardGrid"). */
export const entrySlug = (kind: GalleryEntry['kind'], renderKey: string): string =>
  `${kind}.${renderKey}`

const curatedBlocks = new Map(galleryBlocks.map((b) => [b.slug, b]))

// Render keys in registry order, with any curated-only slugs appended (defensive —
// curated blocks should always be registered).
const blockKeys = [
  ...Object.keys(blockComponents),
  ...galleryBlocks.map((b) => b.slug).filter((slug) => !(slug in blockComponents)),
]

const blockEntries: GalleryEntry[] = blockKeys.map((slug) => {
  const curated = curatedBlocks.get(slug)
  return {
    slug: entrySlug('block', slug),
    kind: 'block',
    renderKey: slug,
    title: curated?.title ?? slug,
    description: curated?.description,
    category: curated?.category ?? 'content',
    variants: curated?.variants ?? [],
  }
})

const heroEntries: GalleryEntry[] = galleryHeros.map((hero) => ({
  slug: entrySlug('hero', hero.type),
  kind: 'hero',
  renderKey: hero.type,
  title: hero.title,
  description: hero.description,
  category: hero.category ?? 'hero',
  variants: hero.variants,
}))

/** Every gallery entry, heros last. Display + static-param order. */
export const galleryEntries: GalleryEntry[] = [...blockEntries, ...heroEntries]

const bySlug = new Map(galleryEntries.map((e) => [e.slug, e]))

/** Look up one entry by its url-safe slug. `undefined` if no such entry. */
export const getGalleryEntry = (slug: string): GalleryEntry | undefined => bySlug.get(slug)
