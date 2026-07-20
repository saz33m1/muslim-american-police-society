import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { seedHeaderNav } from '../src/Header/seedNav'

/**
 * Seed the `header` global with the default nav IA. Idempotent: only fills an
 * EMPTY global, so it never overwrites admin edits. No S3 writes, so — like
 * ensure-admin — it is safe to point DATABASE_URL at staging/prod and run once
 * there. On deploy this same seed runs via the seed_header_nav migration.
 *
 *   node --import tsx/esm scripts/seed-header.ts
 */
const payload = await getPayload({ config })
try {
  const result = await seedHeaderNav(payload)
  console.log(`seed-header: ${result}`)
} finally {
  await payload.destroy()
}
process.exit(0)
