import type { Media, Post } from '@/payload-types'
import type { Payload } from 'payload'

export type GalleryCard = { post: Post; cover: Media; count: number }

/**
 * Map queried posts to gallery cards. Pure (no DB), so the cover-selection and
 * count rules are unit-testable:
 *  - drop posts whose gallery has no usable (populated, url-bearing) photo
 *  - cover = the editor-chosen `galleryCover` when it's a real photo, else the
 *    first gallery photo
 *  - `count` is the gallery size, independent of which photo is the cover
 */
export const toGalleryCards = (posts: Post[]): GalleryCard[] =>
  posts
    .map((post): GalleryCard | null => {
      const images = (post.gallery || []).filter((g): g is Media =>
        Boolean(g && typeof g === 'object' && (g as Media).url),
      )
      if (images.length === 0) return null
      const picked = post.galleryCover
      const cover =
        picked && typeof picked === 'object' && picked.url ? (picked as Media) : images[0]
      return { post, cover, count: images.length }
    })
    .filter((c): c is GalleryCard => c !== null)

/**
 * Fetch the posts the Featured Galleries block renders: published, has a gallery,
 * not a Statement, newest gallery activity first. Takes `payload` so it runs the
 * same code in the block (real request) and in tests.
 */
export const getGalleryHighlights = async (
  payload: Payload,
  limit: number,
): Promise<GalleryCard[]> => {
  const { docs } = await payload.find({
    collection: 'posts',
    depth: 1,
    limit,
    sort: '-galleryUpdatedAt',
    where: {
      _status: { equals: 'published' },
      gallery: { exists: true },
      // Statements aren't photo galleries — keep that category out.
      'categories.slug': { not_equals: 'statements' },
    },
    select: { slug: true, title: true, gallery: true, galleryCover: true, galleryUpdatedAt: true },
  })
  return toGalleryCards(docs as Post[])
}

export const fmtDate = (iso?: string | null): string | null =>
  iso
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        // Format in UTC so a calendar date entered as midnight-UTC (publishedAt) isn't
        // shifted back a day when the server's local zone is behind UTC — and so the
        // label is identical in every environment (local Eastern vs prod UTC).
        timeZone: 'UTC',
      }).format(new Date(iso))
    : null
