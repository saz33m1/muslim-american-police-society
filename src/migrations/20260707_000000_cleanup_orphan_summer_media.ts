import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// One-shot cleanup: when the summer posts were restored (see
// 20260706_000000_restore_summer_posts), the media the earlier delete had left
// orphaned in the bucket was still present, so the restore's uploads collided
// and took `-25`+ suffixed filenames. That leaves the old originals as unowned
// duplicates. This removes them.
//
// Env-safe by construction: it only deletes media matching a post's slug that
// the *restored post does not reference*. On an env where the post already
// points at the base-named files (no collision happened), the referenced set IS
// those files, so nothing is deleted. Never throws, so it can't block a deploy.

const SLUGS = ['4th-annual-summer-dc-networking-event', '5th-annual-summer-dc-networking-event']

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  for (const slug of SLUGS) {
    try {
      const posts = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const post = posts.docs[0] as
        | { heroImage?: unknown; gallery?: unknown[]; meta?: { image?: unknown } }
        | undefined
      if (!post) continue

      // Media the restored post actually uses — never delete these.
      const referenced = new Set<number | string>()
      const add = (v: unknown) => {
        if (typeof v === 'number' || typeof v === 'string') referenced.add(v)
      }
      add(post.heroImage)
      ;(post.gallery || []).forEach(add)
      add(post.meta?.image)
      // Guard: if we somehow read no references, skip rather than delete blindly.
      if (referenced.size === 0) continue

      const media = await payload.find({
        collection: 'media',
        where: { filename: { like: slug } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      const orphans = media.docs.filter((m) => !referenced.has(m.id))

      let removed = 0
      for (const m of orphans) {
        // Per-doc delete so the storage plugin removes the S3 object + variants.
        await payload.delete({ collection: 'media', id: m.id, overrideAccess: true })
        removed++
      }
      payload.logger.info(
        `cleanup-orphan-summer-media: "${slug}" removed ${removed} orphan media, kept ${referenced.size}`,
      )
    } catch (err) {
      payload.logger.error(
        `cleanup-orphan-summer-media: "${slug}" failed: ${(err as Error).message}`,
      )
    }
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Deleted media cannot be restored here; nothing to do.
}
