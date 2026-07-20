import type { GalleryHighlightsBlock as Props } from '@/payload-types'

import configPromise from '@payload-config'
import { CalendarDays, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

import { fmtDate, getGalleryHighlights } from './data'

/**
 * Featured Galleries — surfaces published posts that have a photo gallery,
 * most-recently-updated first (see data.ts; content is queried, not hand-picked).
 *
 * Renders as a plain tiled image grid matching the MediaGrid "Grid, no lightbox"
 * look: 4:3 cover tiles in a gap-4 grid with a hover zoom, a title + photo-count/
 * date caption beneath, and the whole tile deep-linking into that post's gallery.
 */
export const GalleryHighlightsBlock: React.FC<Props & { id?: string }> = async (props) => {
  const { eyebrow, heading, body, limit: limitFromProps, anchorId } = props
  const limit = limitFromProps ?? 6

  const payload = await getPayload({ config: configPromise })
  const cards = await getGalleryHighlights(payload, limit)

  // Nothing to feature (fresh DB / CI): render nothing rather than an empty shell.
  if (cards.length === 0) return null

  const showHeader = eyebrow || heading || body

  return (
    <section className="container my-12 scroll-mt-24" id={anchorId || undefined}>
      {showHeader && (
        <div className="mb-8 max-w-2xl">
          {eyebrow && <p className="mb-3 type-eyebrow text-primary">{eyebrow}</p>}
          {heading && <h2 className="type-h2">{heading}</h2>}
          {body && <RichText className="mt-4" data={body} enableGutter={false} />}
        </div>
      )}

      {/* Same grid mechanics as MediaGrid "Grid, no lightbox" (columns:4): two-up on
          phones, four-up from lg, gap-4. */}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ post, cover, count }) => {
          const updated = fmtDate(post.galleryUpdatedAt)
          return (
            <li key={post.slug}>
              <Link className="group block" href={`/latest-updates/${post.slug}#post-gallery`}>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-secondary">
                  <Media
                    fill
                    imageSize="card"
                    // scale-110 resting crop: some covers come back letterboxed in the card
                    // variant, so a slight zoom hides the bars; hover nudges it a touch further.
                    imgClassName="object-cover scale-110 transition-transform duration-300 group-hover:scale-[1.15]"
                    resource={cover}
                    size="(max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="mt-2.5">
                  <h3 className="type-h5 line-clamp-2 text-foreground transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ImageIcon aria-hidden className="size-3 shrink-0" />
                      {count} {count === 1 ? 'photo' : 'photos'}
                    </span>
                    {updated && (
                      <span className="flex items-center gap-1">
                        <CalendarDays aria-hidden className="size-3 shrink-0" />
                        {updated}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
