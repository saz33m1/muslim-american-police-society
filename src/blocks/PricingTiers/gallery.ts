import type { PricingTiersBlock as PricingTiersBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

type Plan = NonNullable<PricingTiersBlockProps['plans']>[number]

const feats = (...items: string[]): Plan['features'] => items.map((feature) => ({ feature }))

const join = (label: string): Plan['links'] => [
  { link: { type: 'custom', url: '#', label, newTab: false } },
]

const plans: Plan[] = [
  {
    name: 'Full Members',
    price: 'Free',
    description:
      'Muslim Americans who are current or former public-sector employees of federal, state, or local government.',
    features: feats(
      'All MAPS career services',
      'All MAPS policy products & legal advocacy',
      'Access to all members, leaders & chapters',
      'All MAPS & partner events',
    ),
    featured: true,
    links: join('Become a member'),
  },
  {
    name: 'Associates',
    price: 'Free',
    description: 'Muslim Americans pursuing or interested in a career in public service.',
    features: feats('MAPS career services', 'Member events & networking', 'Chapter access'),
    featured: false,
    links: join('Join as an associate'),
  },
  {
    name: 'Affiliates',
    price: '$25 / year',
    description: 'Organizations and partners aligned with the MAPS mission.',
    features: feats('Partner event co-hosting', 'Network introductions', 'Shared resources'),
    featured: false,
    links: join('Partner with us'),
  },
]

export const pricingTiersGallery: GalleryBlock<PricingTiersBlockProps> = {
  slug: 'pricingTiers',
  title: 'Pricing Tiers',
  category: 'content',
  description:
    'Grid of membership or pricing plans — each with a name, price, eligibility blurb, feature checklist, and call to action. One plan can be highlighted.',
  variants: [
    {
      name: 'Three plans, with header',
      description: 'Section header above a 3-up grid; the first plan is highlighted.',
      props: {
        blockType: 'pricingTiers',
        columns: '3',
        header: {
          enableHeader: true,
          heading: 'Membership',
          body: prose('MAPS membership is built around public service. Find the tier that fits you.'),
        },
        plans,
      },
    },
    {
      name: 'No header',
      description: 'Plans only, dropped under an existing page heading.',
      props: {
        blockType: 'pricingTiers',
        columns: '3',
        header: { enableHeader: false },
        plans,
      },
    },
  ],
}
