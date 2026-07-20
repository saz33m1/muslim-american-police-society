import type { MapLocationCardsBlock as MapLocationCardsBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

// Sample MAPS chapter locations. The map renders only when
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set (the #70 env-gate); with no key the
// "With map" variant degrades to cards-only — the same render as "Cards only".
const locations: MapLocationCardsBlockProps['locations'] = [
  {
    name: 'MAPS National',
    address: '1100 13th St NW\nWashington, DC 20005',
    phone: '(202) 555-0142',
    email: 'hello@example.org',
    linkLabel: 'Get directions',
    linkUrl: 'https://maps.google.com',
  },
  {
    name: 'MAPS New York',
    address: '120 Broadway\nNew York, NY 10271',
    email: 'ny@example.org',
    linkLabel: 'Get directions',
    linkUrl: 'https://maps.google.com',
  },
  {
    name: 'MAPS Texas',
    address: '500 Main St\nHouston, TX 77002',
    phone: '(713) 555-0188',
    linkLabel: 'Get directions',
    linkUrl: 'https://maps.google.com',
  },
]

export const mapLocationCardsGallery: GalleryBlock<MapLocationCardsBlockProps> = {
  slug: 'mapLocationCards',
  title: 'Map + Location Cards',
  category: 'content',
  description:
    'Location cards (name, address, contact, link) beside an embedded map. The map is gated on NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — with a key it renders a Google Embed map, without one it degrades to cards-only. The "With map" variant shows the keyed state once a key is configured; "Cards only" forces the degraded state.',
  variants: [
    {
      name: 'With map',
      description:
        'Map + cards. Renders the embedded map when an API key is configured; degrades to cards-only otherwise.',
      props: {
        blockType: 'mapLocationCards',
        enableMap: true,
        eyebrow: 'Find us',
        heading: 'Our chapters',
        intro: prose('Visit a MAPS chapter or reach out to the team near you.'),
        locations,
      },
    },
    {
      name: 'Cards only (degraded)',
      description:
        'The no-key fallback — map disabled, locations rendered as a clean card grid with no error.',
      props: {
        blockType: 'mapLocationCards',
        enableMap: false,
        heading: 'Our chapters',
        locations,
      },
    },
  ],
}
