import type { LogoStripBlock as LogoStripBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { logoAmt, logoCmsa, logoMaemsa, logoMlsa } from '@/blocks/gallery-helpers'

type LogoItem = NonNullable<LogoStripBlockProps['items']>[number]

const logos: LogoItem[] = [
  { logo: logoMlsa, enableLink: false },
  { logo: logoCmsa, enableLink: false },
  { logo: logoAmt, enableLink: false },
  { logo: logoMaemsa, enableLink: false },
]

export const logoStripGallery: GalleryBlock<LogoStripBlockProps> = {
  slug: 'logoStrip',
  title: 'Logo Strip',
  category: 'content',
  description:
    'Row of partner / supporter logos with an optional heading. A static centered grid, or a continuous auto-scrolling marquee (pure CSS, pauses on hover, respects reduced-motion).',
  variants: [
    {
      name: 'Grid',
      description: 'Static, centered, wraps onto multiple rows.',
      props: {
        blockType: 'logoStrip',
        layout: 'grid',
        heading: 'Trusted by organizations across the nation',
        items: logos,
      },
    },
    {
      name: 'Marquee',
      description: 'Continuous auto-scroll. Best with many logos.',
      props: {
        blockType: 'logoStrip',
        layout: 'marquee',
        heading: 'Our partners',
        items: logos,
      },
    },
  ],
}
