// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors api.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Only meaningful once scripts/import-photos.ts has run against this DB (the
// migration originals are gitignored, so CI has none — the suite no-ops there by
// design: with zero photos in the Photo Library folder the invariant is vacuous).
// Guards the two things blocks rely on for every imported photo: a non-empty alt
// (accessibility) and a folder assignment (so editors can find it).
describe('Photo Library media', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('every photo under the Photo Library folder has alt text and a folder', async () => {
    const { docs: folders } = await payload.find({
      collection: 'payload-folders',
      where: { name: { equals: 'Photo Library' } },
      depth: 0,
      limit: 1,
    })
    const library = folders[0]
    if (!library) return // import not run in this environment — nothing to assert

    // Aspect subfolders under the library.
    const { docs: subfolders } = await payload.find({
      collection: 'payload-folders',
      where: { folder: { equals: library.id } },
      depth: 0,
      limit: 100,
    })
    const aspectIds = subfolders.map((f) => f.id)
    expect(aspectIds.length).toBeGreaterThan(0)

    const { docs: photos } = await payload.find({
      collection: 'media',
      where: { folder: { in: aspectIds } },
      depth: 0,
      limit: 1000,
    })
    expect(photos.length).toBeGreaterThan(0)
    for (const p of photos) {
      expect(p.alt?.trim(), `media ${p.filename} missing alt`).toBeTruthy()
      expect(p.folder, `media ${p.filename} missing folder`).toBeTruthy()
    }
  })
})
