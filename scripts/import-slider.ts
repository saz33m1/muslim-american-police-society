/**
 * Import the home-page Sliders CMS images as Media (issue #91, Phase 6).
 *
 * The Webflow "Sliders" collection is 40 event photos behind the home hero
 * carousel. They live only on the Webflow CDN (URLs in the export CSV), so
 * download each, store the original under a tracked dir, and upsert a Media doc
 * (idempotent by filename). The home slice folds them into a MediaGallery
 * carousel by resolving filenames with the `slider-` prefix at runtime.
 *
 *   npm run import:slider
 */

import 'dotenv/config'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

const ROOT = process.cwd()
const CSV = path.join(ROOT, 'migration/webflow_cms_data/MAPS National - Sliders - 68c6363e1081a0820ae4c618.csv')
const TRACKED = path.join(ROOT, 'public/import/slider')

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  await mkdir(TRACKED, { recursive: true })

  const csv = await readFile(CSV, 'utf8')
  const lines = csv.split(/\r?\n/).filter(Boolean).slice(1) // drop header

  let created = 0
  let skipped = 0
  let i = 0
  for (const line of lines) {
    const urlMatch = line.match(/https:\/\/cdn[^,"\s]+/)
    if (!urlMatch) continue
    const url = urlMatch[0]
    const name = (line.split(',')[0] || '').trim() || `Slide ${i + 1}`
    i += 1
    const base = `slider-${String(i).padStart(2, '0')}.jpg`

    const found = await payload.find({
      collection: 'media',
      where: { filename: { like: base.replace('.jpg', '') } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      skipped++
      continue
    }

    const tracked = path.join(TRACKED, base)
    let buffer: Buffer
    if (existsSync(tracked)) {
      buffer = await readFile(tracked)
    } else {
      const res = await fetch(url)
      if (!res.ok) {
        payload.logger.warn(`slider: download failed ${url} (${res.status})`)
        continue
      }
      buffer = Buffer.from(await res.arrayBuffer())
      await writeFile(tracked, buffer)
    }

    await payload.create({
      collection: 'media',
      data: { alt: `MAPS National event — ${name}` },
      file: { name: base, data: buffer, mimetype: 'image/jpeg', size: buffer.length },
      overrideAccess: true,
    })
    created++
    payload.logger.info(`slider: created Media ${base}`)
  }

  payload.logger.info(`Slider import complete: ${created} created, ${skipped} already present.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
