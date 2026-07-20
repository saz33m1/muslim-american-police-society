import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type {
  AcademyVideo,
  AcademyVideosBlock as AcademyVideosBlockProps,
  VideoCategory,
} from '@/payload-types'

import RichText from '@/components/RichText'
import { getMediaUrl } from '@/utilities/getMediaUrl'

import { AcademyVideosClient, type VideoCard } from './AcademyVideosClient'

/**
 * Turn a watch/share URL into an embeddable player URL. Handles the common
 * YouTube forms; anything else is passed through verbatim (the source stores the
 * URL as given and we never fetch it). Returns null if there's no URL.
 */
const toEmbed = (url: string | null | undefined): string | null => {
  if (!url) return null
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

/**
 * Derive a poster image from the video URL without fetching it. YouTube exposes
 * a static thumbnail per id; Vimeo does not (needs oEmbed), so we skip it and
 * let an uploaded `thumbnail` cover those. Returns null when none can be derived.
 */
const deriveThumb = (url: string | null | undefined): string | null => {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return null
}

/** Strip a "MAPS Academy: " / "MAPS Policy & Advocacy: " style prefix from a
 *  category label (everything up to and including the first colon). Keeps a
 *  colon-less title intact. */
const stripCatPrefix = (title: string): string => title.replace(/^[^:]*:\s*/, '').trim() || title

const toTab = (c: number | VideoCategory): { value: string; label: string } | null => {
  if (typeof c !== 'object') return null
  return { value: c.slug || String(c.id), label: stripCatPrefix(c.title) }
}

const toCard = (doc: AcademyVideo): VideoCard | null => {
  const embedUrl = toEmbed(doc.videoUrl)
  if (!embedUrl) return null
  const thumb = doc.thumbnail
  const hasThumb = thumb && typeof thumb === 'object' && thumb.url
  const derived = deriveThumb(doc.videoUrl)
  const categories = (doc.categories || [])
    .map(toTab)
    .filter((c): c is { value: string; label: string } => Boolean(c))

  return {
    id: String(doc.id),
    title: doc.title,
    embedUrl,
    categories,
    ...(doc.description ? { description: doc.description } : {}),
    ...(hasThumb
      ? { thumbSrc: getMediaUrl(thumb.url!, thumb.updatedAt), thumbAlt: thumb.alt || doc.title }
      : derived
        ? { thumbSrc: derived, thumbRemote: true, thumbAlt: doc.title }
        : {}),
  }
}

/**
 * Academy Videos — a filterable video grid sourced from the AcademyVideos
 * collection. The server resolves docs to plain descriptors and hands them to a
 * client component that owns the category filter bar and the lightbox player.
 */
export const AcademyVideosBlock: React.FC<AcademyVideosBlockProps & { id?: string }> = async (
  props,
) => {
  const { categories, eyebrow, heading, intro, limit, populateBy, selectedVideos } = props

  let docs: AcademyVideo[] = []
  if (populateBy === 'selection') {
    docs = (selectedVideos || [])
      .map((v) => (typeof v === 'object' ? v : null))
      .filter((v): v is AcademyVideo => Boolean(v))
  } else {
    const categoryIds = (categories || []).map((c) => (typeof c === 'object' ? c.id : c))
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'academy-videos',
      depth: 1,
      limit: limit && limit > 0 ? limit : 0,
      sort: 'order',
      ...(categoryIds.length > 0 ? { where: { categories: { in: categoryIds } } } : {}),
    })
    docs = result.docs
  }

  const cards = docs.map(toCard).filter((c): c is VideoCard => Boolean(c))
  if (cards.length === 0) return null

  const hasHeader = eyebrow || heading || intro

  return (
    <section className="container py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {hasHeader && (
          <div className="mb-12 max-w-2xl">
            {eyebrow && (
              <p className="mb-2 type-eyebrow text-primary">
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2 className="type-h2">{heading}</h2>
            )}
            {intro && <RichText className="mt-4" data={intro} enableGutter={false} />}
          </div>
        )}

        <AcademyVideosClient videos={cards} />
      </div>
    </section>
  )
}
