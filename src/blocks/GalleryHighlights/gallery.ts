import type { GalleryHighlightsBlock as Props } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

export const galleryHighlightsGallery: GalleryBlock<Props> = {
  slug: 'galleryHighlights',
  title: 'Featured Galleries',
  category: 'data',
  description:
    'Auto-lists published posts that have a photo gallery, most-recently-updated first, as a plain tiled image grid; each tile shows a cover + title + photo count and deep-links into that post’s gallery. Queries live Posts — the cards below reflect real data in this environment.',
  variants: [
    {
      name: 'Grid',
      description: 'Tiled cover grid; each tile links into that post’s gallery.',
      props: {
        blockType: 'galleryHighlights',
        eyebrow: 'From our events',
        heading: 'Recent photo galleries',
        body: prose('See the latest moments from MAPS gatherings across the country.'),
        limit: 6,
      } as Props,
    },
  ],
}
