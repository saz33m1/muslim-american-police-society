import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { readCsv } from '@/import/csv'
import { readEnvelope } from '@/import/envelope'
import { latestUpdatesImport } from '@/import/mappings/posts'
import { resolveTransform } from '@/import/transforms'
import type { RunOptions, TransformContext } from '@/import/types'

/**
 * One-off: import a SINGLE Latest Updates row into `posts` and force it
 * published, regardless of the Webflow `Draft` flag. Reuses the real import
 * transforms/finalize so the post is identical to a normal migrated post
 * (image re-hosted, HTML → Lexical, category linked, meta mirrored) — it only
 * overrides the publish state. Use when a source row is still a Webflow draft
 * but should be live on the migrated site.
 *
 *   npm run import -- <ignored>   # not this; run directly:
 *   node --import tsx/esm scripts/publish-one-update.ts <slug>
 */
const SLUG = process.argv[2] || '5th-annual-summer-dc-networking-event'
const imp = latestUpdatesImport
const upsertKey = imp.upsertKey || 'legacyItemId'

const payload = await getPayload({ config })
try {
  const rows = readCsv(imp.csv)
  const rowIndex = rows.findIndex((r) => (r['Slug'] || '').trim() === SLUG)
  if (rowIndex < 0) throw new Error(`No CSV row with slug "${SLUG}" in ${imp.csv}`)
  const row = rows[rowIndex]

  const options: RunOptions = { dryRun: false, verbose: false, strict: false, download: true }
  const ctx: TransformContext = {
    payload,
    row,
    rowIndex,
    options,
    cache: new Map<string, unknown>(),
    addWarning: (message) => console.warn(`  warn  ${message}`),
  }

  const env = readEnvelope(row)
  const doc: Record<string, unknown> = {}
  if (env.legacyItemId) doc.legacyItemId = env.legacyItemId
  doc._status = 'published' // force live, ignoring the Webflow Draft flag

  for (const fm of imp.fields) {
    const raw = fm.column ? row[fm.column] : undefined
    const value = await resolveTransform(fm.transform, fm.options)(raw, ctx)
    if (value === undefined || value === null || value === '') {
      if (fm.required) throw new Error(`required field "${fm.field}" is empty for "${SLUG}"`)
      continue
    }
    doc[fm.field] = value
  }

  const finalDoc = imp.finalize ? imp.finalize(doc, row) : doc
  const keyValue = (finalDoc as Record<string, unknown>)[upsertKey]

  let existingId: string | number | undefined
  if (keyValue != null && keyValue !== '') {
    const found = await payload.find({
      collection: imp.collection,
      where: { [upsertKey]: { equals: keyValue } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    existingId = found.docs[0]?.id
  }

  const context = { disableRevalidate: true }
  if (existingId != null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await payload.update({ collection: imp.collection, id: existingId, data: finalDoc as any, overrideAccess: true, context })
    console.log(`updated + published: ${(res as { slug?: string }).slug} (_status=${(res as { _status?: string })._status})`)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await payload.create({ collection: imp.collection, data: finalDoc as any, overrideAccess: true, context })
    console.log(`created + published: ${(res as { slug?: string }).slug} (_status=${(res as { _status?: string })._status})`)
  }
} finally {
  await payload.destroy()
}
process.exit(0)
