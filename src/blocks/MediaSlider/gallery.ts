import type { MediaSliderBlock as MediaSliderBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import {
  sampleCapitol,
  sampleCia,
  sampleCityHall,
  sampleGeorgetown,
  sampleLibrary,
  sampleReception,
} from '@/blocks/gallery-helpers'

type GalleryItem = NonNullable<MediaSliderBlockProps['images']>[number]

const shots: { image: GalleryItem['image']; caption: string }[] = [
  { image: sampleCapitol, caption: 'On the steps of the U.S. Capitol' },
  { image: sampleReception, caption: 'A MAPS evening reception' },
  { image: sampleCityHall, caption: 'City hall gathering' },
  { image: sampleGeorgetown, caption: 'Panel discussion at Georgetown Law' },
  { image: sampleLibrary, caption: 'Outside the Library of Congress' },
  { image: sampleCia, caption: 'At CIA headquarters' },
]

const images: GalleryItem[] = shots.map(({ caption, image }) => ({ image, caption }))

export const mediaSliderGallery: GalleryBlock<MediaSliderBlockProps> = {
  slug: 'mediaSlider',
  title: 'Image Slider',
  category: 'media',
  description:
    'A swipeable, autoplaying horizontal track of images with previous / next controls and an optional click-to-zoom lightbox.',
  variants: [
    {
      name: 'Slider with lightbox',
      description: 'Horizontal, swipeable track; click any image to open the full-size lightbox.',
      props: {
        blockType: 'mediaSlider',
        enableLightbox: true,
        heading: 'In the community',
        images,
      },
    },
    {
      name: 'Slider, no lightbox',
      description: 'Swipeable track with the lightbox disabled.',
      props: {
        blockType: 'mediaSlider',
        enableLightbox: false,
        images,
      },
    },
  ],
}
