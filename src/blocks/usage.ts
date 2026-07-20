import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Page } from '@/payload-types'

/** One place an entry is used: a page, the URL, and how many instances sit on it. */
export type UsageSite = { title: string; href: string; count: number }

/** Entry slug (`${kind}.${renderKey}`) → the pages that use it. */
export type UsageMap = Record<string, UsageSite[]>

const hrefFor = (slug: Page['slug']) => (slug === 'home' ? '/' : `/${slug ?? ''}`)

async function computeUsage(): Promise<UsageMap> {
  const usage: UsageMap = {}
  try {
    const payload = await getPayload({ config: configPromise })
    // `select` narrows the returned rows to these fields (not full `Page`), so let
    // the type infer rather than annotating `Page[]`.
    const { docs } = await payload.find({
      collection: 'pages',
      depth: 0,
      draft: true, // authoring state — count where a block sits right now, published or not
      limit: 1000,
      pagination: false,
      overrideAccess: true,
      select: { title: true, slug: true, layout: true, hero: true },
    })

    const add = (entrySlug: string, page: (typeof docs)[number]) => {
      const href = hrefFor(page.slug)
      const sites = (usage[entrySlug] ??= [])
      const existing = sites.find((s) => s.href === href)
      if (existing) existing.count += 1
      else sites.push({ title: page.title, href, count: 1 })
    }

    for (const page of docs) {
      const heroType = page.hero?.type
      if (heroType && heroType !== 'none') add(`hero.${heroType}`, page)
      for (const block of page.layout ?? []) {
        if (block.blockType) add(`block.${block.blockType}`, page)
      }
    }
  } catch {
    // DB unreachable — return the empty map so the showroom still renders, no counts.
  }
  return usage
}

/**
 * Where every gallery entry is used across pages, keyed by entry slug (so callers
 * look up `usage[entry.slug]` directly). Blocks are tallied from each page's
 * `layout` by `blockType`; heros from each page's single `hero.type`.
 *
 * ponytail: 2s race so a schema-push DB hang degrades to "no counts" instead of
 * freezing the showroom — the route CLAUDE.md relies on staying fast to diagnose
 * that hang. Raise/drop the timeout if the page set grows. Posts embed blocks in
 * rich text (not the layout builder), so they're out of scope.
 */
export async function getGalleryUsage(): Promise<UsageMap> {
  return Promise.race([
    computeUsage(),
    new Promise<UsageMap>((resolve) => setTimeout(() => resolve({}), 2000)),
  ])
}

/** Total instances of an entry across all pages. */
export const usageTotal = (sites: UsageSite[] | undefined): number =>
  sites?.reduce((n, s) => n + s.count, 0) ?? 0
