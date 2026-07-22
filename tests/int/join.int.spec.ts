// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors aboutUs.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Assumes the standard test DB seed (CI: `seed:pages` before `test:int`; locally
// `npm run seed:pages`). Guards that /join is the block-built membership page (hero
// + two-tier PricingTiers + closing CTA) rather than the old placeholder, and that
// the tier CTAs use the Outseta-register sentinel href. Structural only — no
// dependency on the local-only hero image, so it is CI-safe.
describe('Join page (membership)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  const getPage = async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'join' } },
      depth: 0,
      limit: 1,
    })
    return docs[0]
  }

  it('composes /join from a hero (with a CTA) + PricingTiers + closing CTA', async () => {
    const page = await getPage()
    expect(page, 'join page must be seeded').toBeDefined()
    expect(page._status).toBe('published')

    const hero = page.hero as { type?: string; links?: unknown[] }
    expect(['highImpact', 'lowImpact']).toContain(hero?.type)
    expect((hero?.links ?? []).length, 'hero needs a join CTA').toBeGreaterThan(0)

    const blockTypes = (page.layout ?? []).map((b) => b.blockType)
    expect(blockTypes).toContain('pricingTiers')
    expect(blockTypes).toContain('cta')
  })

  it('offers exactly two membership tiers, each with an Outseta register CTA', async () => {
    const page = await getPage()
    const tiers = (page.layout ?? []).find(
      (b): b is Extract<typeof b, { blockType: 'pricingTiers' }> => b.blockType === 'pricingTiers',
    )
    expect(tiers).toBeDefined()
    expect(tiers!.plans).toHaveLength(2)
    for (const plan of tiers!.plans ?? []) {
      expect(plan.name, 'each tier needs a name').toBeTruthy()
      const url = (plan.links?.[0] as { link?: { url?: string } } | undefined)?.link?.url
      expect(url, `tier "${plan.name}" CTA must open Outseta register`).toBe('#o-register')
    }
  })

  it('closes with a CTA linking to /contact', async () => {
    const page = await getPage()
    const cta = (page.layout ?? []).find(
      (b): b is Extract<typeof b, { blockType: 'cta' }> => b.blockType === 'cta',
    )
    expect(cta).toBeDefined()
    const urls = (cta!.links ?? []).map((l) => (l as { link?: { url?: string } }).link?.url)
    expect(urls).toContain('/contact')
  })
})
