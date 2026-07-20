import type { MediaGridBlock as MediaGridBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import {
  sampleCapitol,
  sampleCia,
  sampleCityHall,
  sampleGeorgetown,
  sampleLibrary,
  sampleReception,
} from '@/blocks/gallery-helpers'

type GalleryItem = NonNullable<MediaGridBlockProps['images']>[number]

const shots: { image: GalleryItem['image']; caption: string }[] = [
  { image: sampleCapitol, caption: 'On the steps of the U.S. Capitol' },
  { image: sampleReception, caption: 'A MAPS evening reception' },
  { image: sampleCityHall, caption: 'City hall gathering' },
  { image: sampleGeorgetown, caption: 'Panel discussion at Georgetown Law' },
  { image: sampleLibrary, caption: 'Outside the Library of Congress' },
  { image: sampleCia, caption: 'At CIA headquarters' },
]

const images: GalleryItem[] = shots.map(({ caption, image }) => ({ image, caption }))

export const mediaGridGallery: GalleryBlock<MediaGridBlockProps> = {
  slug: 'mediaGrid',
  title: 'Image Grid',
  category: 'media',
  description:
    'A gallery of images as a tiled grid, with an optional click-to-zoom lightbox (keyboard-navigable, focus-managed).',
  variants: [
    {
      name: 'Grid with lightbox',
      description: 'Tiled grid; click any image to open the full-size lightbox.',
      props: {
        blockType: 'mediaGrid',
        columns: '3',
        density: 'comfortable',
        enableLightbox: true,
        heading: 'Moments from the network',
        images,
      },
    },
    {
      name: 'Compact photo wall',
      description: 'Dense, four-up 4:3 tiles with tight gaps, a photo wall.',
      props: {
        blockType: 'mediaGrid',
        columns: '4',
        density: 'compact',
        enableLightbox: true,
        heading: 'In the community',
        images,
      },
    },
    {
      name: 'Grid, no lightbox',
      description: 'Plain image grid with the lightbox disabled.',
      props: {
        blockType: 'mediaGrid',
        columns: '4',
        density: 'comfortable',
        enableLightbox: false,
        images,
      },
    },
  ],
}
