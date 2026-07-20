/**
 * One-shot: drop junk Pages from the shared dev DB — the admin e2e CRUD test's
 * `E2E CRUD*` pages and the empty autosave-orphan drafts (null title + null
 * slug) left behind by visiting /admin/collections/pages/create without saving.
 * Safe to re-run — idempotent. (#129)
 *
 *   node --import tsx/esm scripts/purge-junk-pages.ts
 */

import 'dotenv/config'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config: configPromise })

const res = await payload.delete({
  collection: 'pages',
  where: {
    or: [{ title: { like: 'E2E CRUD' } }, { title: { exists: false } }, { title: { equals: '' } }],
  },
})

console.log(`Deleted ${res.docs.length} junk page(s).`)
process.exit(0)
