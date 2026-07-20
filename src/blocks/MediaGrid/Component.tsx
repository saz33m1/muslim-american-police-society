import React from 'react'

import type { MediaGridBlock as MediaGridBlockProps } from '@/payload-types'

import { getMediaUrl } from '@/utilities/getMediaUrl'

import { MediaGalleryClient, type GalleryImage } from '../MediaGallery/MediaGalleryClient'

/**
 * Image grid: a tiled set with an optional click-to-zoom lightbox. Resolves
 * each Media upload to a plain, serializable descriptor here (server side) and
 * hands the list to the shared client surface fixed to the grid layout.
 */
export const MediaGridBlock: React.FC<MediaGridBlockProps> = (props) => {
  const { columns, density, enableLightbox, heading, images } = props

  const resolved: GalleryImage[] = []
  for (const { caption, image } of images || []) {
    if (!image || typeof image !== 'object' || !image.url) continue
    resolved.push({
      src: getMediaUrl(image.url, image.updatedAt),
      alt: caption || image.alt || '',
      width: image.width || 1200,
      height: image.height || 800,
      ...(caption ? { caption } : {}),
    })
  }

  if (resolved.length === 0) return null

  return (
    <section className="container">
      {heading && <h2 className="mb-8 type-h2">{heading}</h2>}
      <MediaGalleryClient
        columns={columns ?? '3'}
        density={density ?? 'comfortable'}
        images={resolved}
        layout="grid"
        lightbox={enableLightbox ?? true}
      />
    </section>
  )
}
