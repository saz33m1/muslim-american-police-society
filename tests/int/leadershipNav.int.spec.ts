// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors api.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'
import { defaultNavGroups } from '@/Header/seedNav'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Assumes the standard test DB seed (CI: `seed:pages` before `test:int`; locally
// run `npm run seed:pages` first). Guards two things the Leadership page depends on:
// the page itself is seeded with a Team block, and — the invariant seedNav.ts's
// header calls out — every default nav href resolves to a real published page, so
// the menu never ships a dead link. Adding the Leadership item without seeding its
// page (or vice versa) turns one of these red.
describe('Leadership page + nav integrity', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  const pageBySlug = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
    })
    return docs[0]
  }

  it('seeds /about-us/leadership with a Team block sourced from the collection', async () => {
    const page = await pageBySlug('about-us/leadership')
    expect(page, 'leadership page must be seeded').toBeDefined()
    expect(page._status).toBe('published')

    const team = (page.layout ?? []).find(
      (b): b is Extract<typeof b, { blockType: 'team' }> => b.blockType === 'team',
    )
    expect(team, 'leadership page must contain a Team block').toBeDefined()
    expect(team!.populateBy).toBe('collection')
  })

  it('lists Leadership under the About Us nav group', () => {
    const about = defaultNavGroups.find((g) => g.href === '/about-us')
    expect(about, 'About Us group must exist').toBeDefined()
    expect(about!.items?.some((i) => i.href === '/about-us/leadership')).toBe(true)
  })

  it('resolves every default nav href to a published page (no dead links)', async () => {
    const hrefs = defaultNavGroups
      .flatMap((g) => [g.href, ...(g.items ?? []).map((i) => i.href)])
      .filter((h): h is string => Boolean(h))
    for (const href of hrefs) {
      const page = await pageBySlug(href.replace(/^\//, ''))
      expect(page, `nav href ${href} has no seeded page`).toBeDefined()
      expect(page._status, `nav href ${href} page not published`).toBe('published')
    }
  })
})
