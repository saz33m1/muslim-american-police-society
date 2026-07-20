import type { ComparisonTableBlock as ComparisonTableBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

type Row = NonNullable<ComparisonTableBlockProps['rows']>[number]
type Cell = NonNullable<Row['cells']>[number]

const check: Cell = { type: 'check' }
const cross: Cell = { type: 'cross' }
const text = (t: string): Cell => ({ type: 'text', text: t })

const row = (label: string, cells: Cell[]): Row => ({ label, cells })

export const comparisonTableGallery: GalleryBlock<ComparisonTableBlockProps> = {
  slug: 'comparisonTable',
  title: 'Comparison Table',
  category: 'content',
  description:
    'A capability matrix — options across the top, features down the side, and a check, cross, value, or image (e.g. a QR code) in each cell. Scrolls horizontally on narrow screens.',
  variants: [
    {
      name: 'Membership comparison',
      description: 'Three plans compared across features, with a text row for cost.',
      props: {
        blockType: 'comparisonTable',
        header: {
          enableHeader: true,
          heading: 'Compare membership',
          body: prose('What each MAPS membership tier includes.'),
        },
        columns: [{ label: 'Full Members' }, { label: 'Associates' }, { label: 'Affiliates' }],
        rows: [
          row('Career services', [check, check, cross]),
          row('Policy & legal advocacy', [check, cross, cross]),
          row('Member events & networking', [check, check, check]),
          row('Partner co-hosting', [cross, cross, check]),
          row('Annual cost', [text('Free'), text('Free'), text('$25')]),
        ],
      },
    },
  ],
}
