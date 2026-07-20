import type { CallToActionBlock as CTABlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { heading, paragraph, richText } from '@/blocks/gallery-helpers'

export const callToActionGallery: GalleryBlock<CTABlockProps> = {
  slug: 'cta',
  title: 'Call to Action',
  category: 'cta',
  description: 'A bordered banner pairing a short rich-text pitch with one or two action buttons.',
  variants: [
    {
      name: 'Two actions (default + outline)',
      description: 'Primary and secondary buttons side by side.',
      props: {
        blockType: 'cta',
        richText: richText(
          heading('Join the network', 'h2'),
          paragraph('Sign up as a Full Member, Associate Member, Affiliate, or Ally today.'),
        ),
        links: [
          { link: { type: 'custom', url: '#', label: 'Become a member', newTab: false, appearance: 'default' } },
          { link: { type: 'custom', url: '#', label: 'Explore programs', newTab: false, appearance: 'outline' } },
        ],
      },
    },
    {
      name: 'Single action',
      description: 'One primary button.',
      props: {
        blockType: 'cta',
        richText: richText(
          heading('Support our mission', 'h3'),
          paragraph('MAPS is a 501(c)(3) non-profit. All donations are fully tax-deductible.'),
        ),
        links: [
          { link: { type: 'custom', url: '#', label: 'Donate', newTab: false, appearance: 'default' } },
        ],
      },
    },
  ],
}
