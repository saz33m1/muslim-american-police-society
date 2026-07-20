import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// Retry of 20260707_000000_cleanup_orphan_summer_media. That one cleaned staging
// but left prod's orphans in place: a delete failed silently (its per-slug try
// wrapped the whole loop, and it never threw, so Payload still recorded it done).
// This is a fresh migration name so it re-runs even where the first is recorded.
//
// Hardening vs the first pass:
//   - Per-orphan try, so one bad delete no longer skips the rest of the slug.
//   - Each payload.delete runs WITHOUT the migration req, so if the storage-S3
//     afterDelete hook throws, it rolls back only its own inner transaction, not
//     the migration's (a Postgres error inside the migration txn would poison it).
//   - Fallback: if payload.delete throws, drop the dangling row via the db adapter
//     (no S3 hook). That clears the row shown in /api/media; the bucket object is
//     left behind (invisible, cheap) rather than blocking cleanup.
//   - Logs every orphan id and every failure, so the deploy log shows what happened.
//
// Env-safe by construction: only deletes media matching a post's slug that the
// restored post does not reference. Where the post points at the base-named files
// (no collision), the referenced set IS those files and nothing is deleted. Never
// throws, so it can't block a deploy.

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
      if (!post) {
        payload.logger.info(`cleanup-orphan-summer-media(retry): "${slug}" no post, skip`)
        continue
      }

      // Media the restored post actually uses (flat id arrays at depth 0) — keep these.
      const referenced = new Set<number | string>()
      const add = (v: unknown) => {
        if (typeof v === 'number' || typeof v === 'string') referenced.add(v)
      }
      add(post.heroImage)
      ;(post.gallery || []).forEach(add)
      add(post.meta?.image)
      // Guard: never delete blindly if we somehow read no references.
      if (referenced.size === 0) {
        payload.logger.info(`cleanup-orphan-summer-media(retry): "${slug}" 0 refs, skip`)
        continue
      }

      const media = await payload.find({
        collection: 'media',
        where: { filename: { like: slug } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      const orphans = media.docs.filter((m) => !referenced.has(m.id))
      payload.logger.info(
        `cleanup-orphan-summer-media(retry): "${slug}" ${media.docs.length} media, ${referenced.size} referenced, ${orphans.length} orphans [${orphans.map((m) => m.id).join(',')}]`,
      )

      for (const m of orphans) {
        try {
          // No req: a throwing S3 afterDelete rolls back only its own inner txn.
          await payload.delete({ collection: 'media', id: m.id, overrideAccess: true })
          payload.logger.info(`cleanup-orphan-summer-media(retry): deleted media ${m.id} (+object)`)
        } catch (e) {
          payload.logger.error(
            `cleanup-orphan-summer-media(retry): payload.delete ${m.id} failed (${(e as Error).message}); dropping row only`,
          )
          try {
            await payload.db.deleteOne({ collection: 'media', where: { id: { equals: m.id } } })
            payload.logger.info(`cleanup-orphan-summer-media(retry): dropped media row ${m.id}`)
          } catch (e2) {
            payload.logger.error(
              `cleanup-orphan-summer-media(retry): db.deleteOne ${m.id} failed: ${(e2 as Error).message}`,
            )
          }
        }
      }
    } catch (err) {
      payload.logger.error(
        `cleanup-orphan-summer-media(retry): "${slug}" failed: ${(err as Error).message}`,
      )
    }
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Deleted media cannot be restored here; nothing to do.
}
