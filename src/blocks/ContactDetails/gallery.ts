import type { ContactDetailsBlock as ContactDetailsBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

type Item = NonNullable<ContactDetailsBlockProps['items']>[number]

const items: Item[] = [
  { icon: 'email', label: 'Email', value: 'info@mapsnational.org' },
  {
    icon: 'location',
    label: 'Mailing address',
    value: 'Muslim Americans in Public Service\n420 Florida Ave NE, #29\nWashington, DC 20002',
  },
  { icon: 'link', label: 'Online', value: 'mapsnational.org', href: 'https://mapsnational.org' },
]

export const contactDetailsGallery: GalleryBlock<ContactDetailsBlockProps> = {
  slug: 'contactDetails',
  title: 'Contact Details',
  category: 'content',
  description:
    'A column of contact methods — email, phone, address, hours — each with an icon, optional label, and a value that auto-links for email and phone. Pairs beside a Form block.',
  variants: [
    {
      name: 'With heading & intro',
      description: 'Full contact sidebar with heading and intro copy.',
      props: {
        blockType: 'contactDetails',
        heading: 'Contact us',
        intro: prose(
          "We're here to listen and help you find your place in public service. Send us a message and we'll be in touch shortly.",
        ),
        items,
      },
    },
    {
      name: 'Items only',
      description: 'Bare contact list, no heading.',
      props: {
        blockType: 'contactDetails',
        items,
      },
    },
  ],
}
