import type { FeatureSplitBlock as FeatureSplitBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose, sampleGeorgetown, sampleReception } from '@/blocks/gallery-helpers'

const link = (label: string, appearance: 'default' | 'outline' = 'default') => ({
  link: { type: 'custom' as const, url: '#', label, newTab: false, appearance },
})

export const featureSplitGallery: GalleryBlock<FeatureSplitBlockProps> = {
  slug: 'featureSplit',
  title: 'Feature Split',
  category: 'content',
  description:
    'Alternating image + text section: eyebrow, heading, body, and up to two CTAs beside an image. Stack several and alternate the image side for a zig-zag layout.',
  variants: [
    {
      name: 'Image right',
      description: 'Text on the left, image on the right — the default.',
      props: {
        blockType: 'featureSplit',
        imageSide: 'right',
        eyebrow: 'Connect',
        heading: 'Professional networking & community building',
        body: prose(
          'Connect with a powerful network of Muslim American professionals across federal, state, and city government. Our community events create connections and introductions within specific fields and agencies.',
        ),
        links: [link('Join the network'), link('See upcoming events', 'outline')],
        image: sampleReception,
      },
    },
    {
      name: 'Image left',
      description: 'Columns reversed — image on the left. Alternate with the above when stacking.',
      props: {
        blockType: 'featureSplit',
        imageSide: 'left',
        eyebrow: 'Develop',
        heading: 'Career support at every level',
        body: prose(
          'From entry points to senior leadership, MAPS provides mentorship, fellowships, and programming to help public servants advance their careers and serve their communities.',
        ),
        links: [link('Explore programs')],
        image: sampleGeorgetown,
      },
    },
  ],
}
