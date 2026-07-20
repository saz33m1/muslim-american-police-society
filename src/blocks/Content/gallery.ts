import type { ContentBlock as ContentBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { heading, paragraph, richText } from '@/blocks/gallery-helpers'

type Column = NonNullable<ContentBlockProps['columns']>[number]

const column = (size: Column['size'], head: string, body: string): Column => ({
  size,
  richText: richText(heading(head, 'h3'), paragraph(body)),
  enableLink: false,
})

export const contentGallery: GalleryBlock<ContentBlockProps> = {
  slug: 'content',
  title: 'Content',
  category: 'content',
  description: 'A flexible rich-text layout: one or more columns sized in twelfths (full, two-thirds, half, one-third).',
  variants: [
    {
      name: 'Two columns (half + half)',
      description: 'Even two-column split.',
      props: {
        blockType: 'content',
        columns: [
          column('half', 'Our mission', 'Empower Muslim American public servants to excel in their careers and serve their communities.'),
          column('half', 'Our values', 'Community, integrity, and service — building a brighter future through collaboration and mentorship.'),
        ],
      },
    },
    {
      name: 'Three columns (thirds)',
      description: 'Three equal one-third columns.',
      props: {
        blockType: 'content',
        columns: [
          column('oneThird', 'Community', 'A national network of peers, mentors, and allies.'),
          column('oneThird', 'Advocacy', 'A collective voice on policy and representation.'),
          column('oneThird', 'Resources', 'Career support, training, and know-your-rights guidance.'),
        ],
      },
    },
    {
      name: 'Full width with a link',
      description: 'A single full-width column ending in an inline link.',
      props: {
        blockType: 'content',
        columns: [
          {
            size: 'full',
            richText: richText(
              heading('Building a brighter future, together', 'h2'),
              paragraph('At MAPS, we foster a supportive community for Muslim American public servants, helping them excel in their careers and personal growth.'),
            ),
            enableLink: true,
            link: { type: 'custom', url: '#', label: 'Read our story', newTab: false, appearance: 'default' },
          },
        ],
      },
    },
  ],
}
