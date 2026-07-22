// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors api.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'
import { cardIconNames } from '@/blocks/CardGrid/icons'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Assumes the standard test DB seed (CI: `seed:pages` before `test:int`; locally
// `npm run seed:pages`). Guards that the About Us page is the block-built version
// (not the old placeholder) and that every CardGrid icon is a renderable name —
// a `lucideIcon` outside the curated set renders an empty chip, which types can't
// catch here because the seed layout is cast to PageData.
describe('About Us page (block-built)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('composes /about-us from LowImpact hero + CardGrid + CTA', async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'about-us' } },
      depth: 0,
      limit: 1,
    })
    const page = docs[0]
    expect(page, 'about-us page must be seeded').toBeDefined()
    expect(page._status).toBe('published')
    expect((page.hero as { type?: string })?.type).toBe('lowImpact')

    const blockTypes = (page.layout ?? []).map((b) => b.blockType)
    expect(blockTypes).toContain('cardGrid')
    expect(blockTypes).toContain('cta')
  })

  it('gives the What We Do CardGrid 3 cards with renderable icons', async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'about-us' } },
      depth: 0,
      limit: 1,
    })
    const grid = (docs[0].layout ?? []).find(
      (b): b is Extract<typeof b, { blockType: 'cardGrid' }> => b.blockType === 'cardGrid',
    )
    expect(grid).toBeDefined()
    expect(grid!.items).toHaveLength(3)
    for (const card of grid!.items ?? []) {
      expect(card.heading, 'each card needs a heading').toBeTruthy()
      if (card.lucideIcon) {
        expect(cardIconNames, `icon ${card.lucideIcon} not in curated set`).toContain(
          card.lucideIcon,
        )
      }
    }
  })
})
