import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// One-shot content restore: the 4th & 5th Annual Summer DC Networking Event
// posts (and their media) were deleted from prod. This recreates them from
// committed assets so a deploy brings them back — the only content that reaches
// prod through code, since deploys run `payload migrate` (not the import CLI).
//
// Deliberately defensive: every step is wrapped so a content hiccup can NEVER
// throw out of the migration and block a deploy, and it is idempotent (skips a
// post whose slug already exists, reuses media already present by filename), so
// it is a no-op on any env that already has these posts.

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'restore-assets')

type PostMeta = {
  legacyItemId?: string
  title: string
  slug: string
  publishedAt?: string
  categorySlugs: string[]
  postSummary?: string
  membersOnlyUrl?: string
  sticky: boolean
  heroFile: string
  galleryFiles: string[]
}

const SLUGS = ['4th-annual-summer-dc-networking-event', '5th-annual-summer-dc-networking-event']

const readJson = (file: string) => JSON.parse(readFileSync(path.join(ASSETS, file), 'utf8'))

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Fresh context per file-carrying create: the cloud-storage plugin stashes the
  // first upload's file on the context and skips it once set, so a shared object
  // would silently drop every media after the first.
  const ctx = () => ({ disableRevalidate: true })

  const ensureMedia = async (
    filename: string,
    alt: string,
  ): Promise<number | string | undefined> => {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (found.docs[0]) return found.docs[0].id
    const data = readFileSync(path.join(ASSETS, filename))
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file: { name: filename, data, mimetype: 'image/png', size: data.length },
      overrideAccess: true,
      context: ctx(),
    })
    return doc.id
  }

  for (const slug of SLUGS) {
    try {
      const existing = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.docs[0]) {
        payload.logger.info(`restore-summer-posts: "${slug}" already present, skipping`)
        continue
      }

      const meta: PostMeta = readJson(`${slug}.meta.json`)
      const content = readJson(`${slug}.content.json`)

      const categories: (number | string)[] = []
      for (const catSlug of meta.categorySlugs) {
        const c = await payload.find({
          collection: 'categories',
          where: { slug: { equals: catSlug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        if (c.docs[0]) categories.push(c.docs[0].id)
      }

      const heroImage = await ensureMedia(meta.heroFile, meta.title)
      const gallery: (number | string)[] = []
      for (const g of meta.galleryFiles) {
        const id = await ensureMedia(g, meta.title)
        if (id != null) gallery.push(id)
      }

      const created = await payload.create({
        collection: 'posts',
        data: {
          ...(meta.legacyItemId ? { legacyItemId: meta.legacyItemId } : {}),
          title: meta.title,
          slug,
          ...(meta.publishedAt ? { publishedAt: meta.publishedAt } : {}),
          ...(categories.length ? { categories } : {}),
          ...(heroImage != null ? { heroImage } : {}),
          ...(meta.postSummary ? { postSummary: meta.postSummary } : {}),
          content,
          ...(gallery.length ? { gallery } : {}),
          ...(meta.membersOnlyUrl ? { membersOnlyUrl: meta.membersOnlyUrl } : {}),
          sticky: meta.sticky,
          meta: {
            ...(heroImage != null ? { image: heroImage } : {}),
            ...(meta.postSummary ? { description: meta.postSummary } : {}),
          },
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: ctx(),
      })
      // Posts has drafts.autosave enabled, where create with _status:'published'
      // can still land as a draft. Explicitly publish (the admin "Publish"
      // action) so the restored post goes live without a manual step.
      await payload.update({
        collection: 'posts',
        id: created.id,
        data: { _status: 'published' } as never,
        overrideAccess: true,
        context: ctx(),
      })
      payload.logger.info(
        `restore-summer-posts: created + published "${slug}" (${gallery.length} gallery images)`,
      )
    } catch (err) {
      payload.logger.error(
        `restore-summer-posts: failed to restore "${slug}": ${(err as Error).message}`,
      )
    }
  }
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  for (const slug of SLUGS) {
    try {
      await payload.delete({
        collection: 'posts',
        where: { slug: { equals: slug } },
        overrideAccess: true,
      })
    } catch (err) {
      payload.logger.error(`restore-summer-posts down: ${(err as Error).message}`)
    }
  }
}
