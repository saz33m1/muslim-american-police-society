/**
 * One-off: trim baked-in whitespace/transparent padding from partner logo
 * Media files (issue #102 follow-up, LR2). Logos were pulled from a mix of
 * export/CDN sources with wildly different amounts of internal padding, so
 * even though every logo now renders in an identically-sized box
 * (LogoStrip/Component.tsx), the "ink" reads at very different visual sizes.
 * sharp's trim() crops each file to its actual painted content before it's
 * re-hosted, so object-contain scales the real artwork consistently instead
 * of scaling padding along with it.
 *
 *   npx tsx scripts/trim-logo-padding.ts
 *
 * Idempotent: re-running finds nothing left to trim (dimensions unchanged).
 */

import 'dotenv/config'

import sharp from 'sharp'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  const pages = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'about-us/partners' } },
    depth: 2,
    limit: 1,
    pagination: false,
  })
  const page = pages.docs[0]
  const layout = page?.layout as unknown as Array<Record<string, unknown>> | undefined
  const logoBlock = layout?.find((b) => b.blockType === 'logoStrip') as
    | { items?: Array<{ logo: { id: number; filename: string } }> }
    | undefined
  const items = logoBlock?.items || []

  if (items.length === 0) {
    console.error('No logoStrip items found on about-us/partners — nothing to do.')
    process.exit(1)
  }

  let trimmed = 0
  let unchanged = 0

  for (const item of items) {
    const media = item.logo
    if (!media?.filename) continue

    const res = await fetch(`http://localhost:3000/api/media/file/${media.filename}`)
    if (!res.ok) {
      console.warn(`skip ${media.filename}: fetch failed (${res.status})`)
      continue
    }
    const original = Buffer.from(await res.arrayBuffer())

    const origMeta = await sharp(original).metadata()
    const trimmedBuffer = await sharp(original).trim().toBuffer()
    const newMeta = await sharp(trimmedBuffer).metadata()

    if (origMeta.width === newMeta.width && origMeta.height === newMeta.height) {
      unchanged++
      continue
    }

    await payload.update({
      collection: 'media',
      id: media.id,
      data: {},
      file: {
        name: media.filename,
        data: trimmedBuffer,
        mimetype: 'image/webp',
        size: trimmedBuffer.length,
      },
      overrideAccess: true,
    })
    trimmed++
    console.log(
      `trimmed ${media.filename}: ${origMeta.width}x${origMeta.height} -> ${newMeta.width}x${newMeta.height}`,
    )
  }

  console.log(`Done: ${trimmed} trimmed, ${unchanged} already tight.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
