import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Delete every Media doc (and its versions). Used when the storage backend
 * changes (e.g. local-disk -> MinIO/S3): existing Media rows point at files in
 * the old backend and become unreadable once the adapter switches, so they must
 * be recreated. Re-running the image imports afterwards re-uploads originals to
 * the active backend and re-links the collections that reference them
 * (Team.headshot, Posts.heroImage/gallery, …). Seeded-page images need a re-seed.
 */
const main = async (): Promise<void> => {
  const payload = await getPayload({ config })
  try {
    const before = await payload.count({ collection: 'media' })
    await payload.delete({ collection: 'media', where: {}, overrideAccess: true })
    const after = await payload.count({ collection: 'media' })
    console.log(`media: deleted ${before.totalDocs}, remaining ${after.totalDocs}`)
  } finally {
    await payload.destroy()
  }
}

await main()
process.exit(0)
