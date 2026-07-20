import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * One-off: bias the focal point of every CardGrid card image toward the top so
 * the object-cover crop (aspect-video, fairly short) keeps heads/subjects in
 * frame instead of slicing them at the centre line. Focal point is fully
 * editor-controllable in admin afterward — this only seeds a sane default and
 * skips any image whose focal point was already moved off centre.
 *
 *   node --import tsx/esm scripts/set-focal.ts
 */
const FOCAL_Y = 30 // upper third — where heads sit in these program/people shots

const isDefault = (v: number | null | undefined) => v == null || v === 50

const payload = await getPayload({ config })
try {
  // Collect media ids used as CardGrid card images across all pages.
  const pages = await payload.find({
    collection: 'pages',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })
  const imageIds = new Set<number>()
  for (const page of pages.docs) {
    for (const block of (page.layout ?? []) as unknown as Array<Record<string, unknown>>) {
      if (block.blockType !== 'cardGrid' || block.mediaType !== 'image') continue
      for (const item of (block.items ?? []) as Array<{ image?: number | { id: number } }>) {
        const img = item.image
        const id = typeof img === 'object' && img ? img.id : img
        if (typeof id === 'number') imageIds.add(id)
      }
    }
  }

  let changed = 0
  for (const id of imageIds) {
    const doc = await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
    if (!isDefault(doc.focalX) || !isDefault(doc.focalY)) {
      console.log(`  keep  ${doc.filename} (focal ${doc.focalX}/${doc.focalY} — already set)`)
      continue
    }
    await payload.update({
      collection: 'media',
      id,
      data: { focalX: 50, focalY: FOCAL_Y },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    console.log(`set focal ${doc.filename} -> 50/${FOCAL_Y}`)
    changed++
  }
  console.log(`\n${changed} image(s) biased; ${imageIds.size} CardGrid image(s) total.`)
} finally {
  await payload.destroy()
}
process.exit(0)
