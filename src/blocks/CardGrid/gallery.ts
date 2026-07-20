import type { CardGridBlock as CardGridBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import {
  logoAmt,
  logoCmsa,
  logoMaemsa,
  logoMlsa,
  prose,
  sampleCia,
  sampleGeorgetown,
  sampleReception,
} from '@/blocks/gallery-helpers'

type CardItem = NonNullable<CardGridBlockProps['items']>[number]

const item = (
  heading: string,
  body: string,
  opts: {
    withLink?: boolean
    icon?: CardItem['icon']
    image?: CardItem['image']
    lucideIcon?: CardItem['lucideIcon']
  } = {},
): CardItem => ({
  heading,
  body: prose(body),
  icon: opts.icon,
  image: opts.image,
  lucideIcon: opts.lucideIcon,
  links: opts.withLink
    ? [{ link: { type: 'custom', url: '#', label: 'Learn more', newTab: false } }]
    : [],
  enableCardLink: false,
})

export const cardGridGallery: GalleryBlock<CardGridBlockProps> = {
  slug: 'cardGrid',
  title: 'Card Grid',
  category: 'content',
  description:
    'Responsive grid of cards — optional section header, uniform media (image / icon / none), per-card copy, buttons, and an optional whole-card link.',
  variants: [
    {
      name: 'Three columns, with header',
      description:
        'Section header (eyebrow + heading + body) above a 3-up grid; each card has a button.',
      props: {
        blockType: 'cardGrid',
        columns: '3',
        mediaType: 'none',
        header: {
          enableHeader: true,
          eyebrow: 'MAPS Programs',
          heading: 'Advance your career, serve your community and country',
          body: prose(
            'Comprehensive support for Muslim American public servants at every level of government.',
          ),
        },
        items: [
          item(
            'Community Building',
            'Connect with a national network of public servants across government.',
            { withLink: true },
          ),
          item('Legal Advocacy', 'Know your rights, understand redress, and navigate processes.', {
            withLink: true,
          }),
          item('Policy & Advocacy', 'Initiatives that advance representation in public service.', {
            withLink: true,
          }),
        ],
      },
    },
    {
      name: 'Three columns, images',
      description: 'Image media above each card (uniform aspect-video).',
      props: {
        blockType: 'cardGrid',
        columns: '3',
        mediaType: 'image',
        header: { enableHeader: true, heading: 'Across the country' },
        items: [
          item('Panels & forums', 'Conversations on public service at partner institutions.', {
            image: sampleGeorgetown,
          }),
          item('Agency visits', 'Members connect with colleagues across the federal government.', {
            image: sampleCia,
          }),
          item('Member receptions', 'Local chapters and federal ERGs gather year-round.', {
            image: sampleReception,
          }),
        ],
      },
    },
    {
      name: 'Four columns, icons',
      description: 'Compact 4-up grid with an icon per card.',
      props: {
        blockType: 'cardGrid',
        columns: '4',
        mediaType: 'icon',
        header: { enableHeader: true, heading: 'Our Partners' },
        items: [
          item('MLSA', 'Muslim Law Students Association.', { icon: logoMlsa }),
          item('CMSA', 'Congressional Muslim Staff Association.', { icon: logoCmsa }),
          item('American Muslim Today', 'Community media partner.', { icon: logoAmt }),
          item('MAEMSA', 'Muslim American EMS Association.', { icon: logoMaemsa }),
        ],
      },
    },
    {
      name: 'Decorative icons',
      description:
        'The per-card `lucideIcon` chip (distinct from uploaded icon media): a curated Lucide set, shown on imageless cards.',
      props: {
        blockType: 'cardGrid',
        columns: '3',
        mediaType: 'none',
        header: { enableHeader: true, heading: 'Get involved' },
        items: [
          item(
            'Advocacy alerts',
            'Speak up on the issues facing Muslim American public servants.',
            {
              lucideIcon: 'megaphone',
            },
          ),
          item('Join MAPS', 'Become a member and connect with the national network.', {
            lucideIcon: 'circle-plus',
          }),
          item('Chapter events', 'Local gatherings, panels, and receptions year-round.', {
            lucideIcon: 'users',
          }),
          item('Membership benefits', 'Career support, community, and a voice in public service.', {
            lucideIcon: 'star-plus',
          }),
          item('100% free to join', 'No dues: membership is free for eligible public servants.', {
            lucideIcon: 'badge-dollar-sign',
          }),
        ],
      },
    },
    {
      name: 'Two columns, no header',
      description: 'Header disabled; wider two-up cards without buttons.',
      props: {
        blockType: 'cardGrid',
        columns: '2',
        mediaType: 'none',
        header: { enableHeader: false },
        items: [
          item(
            'For federal staffers',
            'Employee resource groups and peer support across agencies.',
          ),
          item('For state & local', 'State committees connecting public servants in your region.'),
        ],
      },
    },
  ],
}
