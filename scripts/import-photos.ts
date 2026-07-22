import 'dotenv/config'

import { existsSync, readFileSync } from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Import the organized migration photo library (scripts docs: docs/scripts.md)
 * into Payload Media, filed into aspect-ratio folders so blocks can pick them.
 *
 *   node --import tsx/esm scripts/import-photos.ts
 *
 * Source: migration/{high_res,medium_res}/{landscape,portrait,square}/*.jpg — the
 * 314 real photos (the other migration/* buckets are intentionally skipped).
 * Alt text comes from migration/_captions.json ({ "<file>.jpg": "<alt>" }); any
 * file without a caption gets a generic fallback so import never blocks. Both the
 * originals and the captions file are gitignored.
 *
 * Idempotent UPSERT keyed on the stored (WebP) filename: re-running after the
 * caption pass updates alt in place rather than duplicating. Per CLAUDE.md media
 * rules: fresh file/context per create, and payload.destroy() before exit so the
 * S3 uploads flush.
 */
const MIGRATION_DIR = path.join(process.cwd(), 'migration')
const RES_DIRS = ['high_res', 'medium_res']
const ASPECTS = ['landscape', 'portrait', 'square'] as const
const FALLBACK_ALT = 'MAPS event photo'

const captions: Record<string, string> = existsSync(path.join(MIGRATION_DIR, '_captions.json'))
  ? JSON.parse(readFileSync(path.join(MIGRATION_DIR, '_captions.json'), 'utf8'))
  : {}

const payload = await getPayload({ config })

/** Find-or-create a media folder by name under an optional parent. */
const ensureFolder = async (name: string, parent: number | null): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'payload-folders',
    where: { and: [{ name: { equals: name } }, { folder: { equals: parent } }] },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0].id as number
  const created = await payload.create({
    collection: 'payload-folders',
    data: { name, folder: parent, folderType: ['media'] },
  })
  return created.id as number
}

try {
  const library = await ensureFolder('Photo Library', null)
  const aspectFolder: Record<string, number> = {}
  for (const a of ASPECTS) {
    aspectFolder[a] = await ensureFolder(a[0].toUpperCase() + a.slice(1), library)
  }

  let created = 0
  let updated = 0
  for (const res of RES_DIRS) {
    for (const aspect of ASPECTS) {
      const dir = path.join(MIGRATION_DIR, res, aspect)
      if (!existsSync(dir)) continue
      const files = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f))
      for (const filename of files) {
        const storedName = filename.replace(/\.jpe?g$/i, '.webp')
        const alt = captions[filename] || FALLBACK_ALT
        const folder = aspectFolder[aspect]

        const existing = await payload.find({
          collection: 'media',
          where: { filename: { equals: storedName } },
          limit: 1,
          depth: 0,
        })
        if (existing.docs[0]) {
          await payload.update({
            collection: 'media',
            id: existing.docs[0].id,
            data: { alt, folder },
          })
          updated++
          continue
        }

        const buffer = readFileSync(path.join(dir, filename))
        await payload.create({
          collection: 'media',
          data: { alt, folder },
          // Fresh object per create — never a shared context (the cloud-storage
          // plugin stashes the first file and skips the rest otherwise).
          file: { data: buffer, name: filename, mimetype: 'image/jpeg', size: buffer.length },
        })
        created++
        if (created % 25 === 0) payload.logger.info(`import-photos: ${created} uploaded...`)
      }
    }
  }
  payload.logger.info(`import-photos: done — ${created} created, ${updated} updated.`)
} finally {
  await payload.destroy() // flush in-flight S3 uploads before exit
}
process.exit(0)
