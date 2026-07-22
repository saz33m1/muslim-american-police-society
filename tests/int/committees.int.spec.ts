// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors aboutUs.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'
import { cardIconNames } from '@/blocks/CardGrid/icons'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Assumes the standard test DB seed (CI: `seed:pages` before `test:int`; locally
// `npm run seed:pages`). Guards that /about-us/committees is the block-built page
// (LowImpact hero + 3-card CardGrid + CTA) with renderable icons, and that the hero
// routes to /join. Structural only — no dependency on any local-only media, CI-safe.
describe('Committees page (block-built)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  const getPage = async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'about-us/committees' } },
      depth: 0,
      limit: 1,
    })
    return docs[0]
  }

  it('composes /about-us/committees from a LowImpact hero + CardGrid + CTA', async () => {
    const page = await getPage()
    expect(page, 'committees page must be seeded').toBeDefined()
    expect(page._status).toBe('published')
    expect((page.hero as { type?: string })?.type).toBe('lowImpact')

    const heroUrls = ((page.hero as { links?: { link?: { url?: string } }[] })?.links ?? []).map(
      (l) => l.link?.url,
    )
    expect(heroUrls, 'hero should route to /join').toContain('/join')

    const blockTypes = (page.layout ?? []).map((b) => b.blockType)
    expect(blockTypes).toContain('cardGrid')
    expect(blockTypes).toContain('cta')
  })

  it('lists exactly three committees, each with a renderable icon', async () => {
    const page = await getPage()
    const grid = (page.layout ?? []).find(
      (b): b is Extract<typeof b, { blockType: 'cardGrid' }> => b.blockType === 'cardGrid',
    )
    expect(grid).toBeDefined()
    expect(grid!.items).toHaveLength(3)
    for (const card of grid!.items ?? []) {
      expect(card.heading, 'each committee card needs a heading').toBeTruthy()
      if (card.lucideIcon) {
        expect(cardIconNames, `icon ${card.lucideIcon} not in curated set`).toContain(
          card.lucideIcon,
        )
      }
    }
  })
})
