import type { TimelineBlock as TimelineBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

type Milestone = NonNullable<TimelineBlockProps['items']>[number]

const milestone = (date: string, title: string, body: string): Milestone => ({
  date,
  title,
  body: prose(body),
})

const items: Milestone[] = [
  milestone(
    '2019',
    'Federal representation',
    'Recognizing the lack of representation for Muslim American public servants, founders began organizing to bridge the gap.',
  ),
  milestone(
    '2020',
    'An interagency push',
    'Efforts to establish Employee Resource Groups at the Department of Transportation and the Small Business Administration laid the groundwork for a unified organization.',
  ),
  milestone(
    'January 2021',
    'Formalization',
    'MAPS was incorporated as a national organization supporting Muslim public servants across every branch and level of government.',
  ),
  milestone(
    'April 2021',
    'Official launch',
    'MAPS launched publicly, empowering Muslim public servants to contribute to a more equitable society.',
  ),
]

export const timelineGallery: GalleryBlock<TimelineBlockProps> = {
  slug: 'timeline',
  title: 'Timeline',
  category: 'content',
  description:
    'Vertical timeline of dated milestones along a connector rail — each with a date, optional title, and body. Stacks on any width.',
  variants: [
    {
      name: 'With header',
      description: 'Section header above the milestone rail.',
      props: {
        blockType: 'timeline',
        header: {
          enableHeader: true,
          heading: 'Our history',
          body: prose('How MAPS grew from informal gatherings into a national network.'),
        },
        items,
      },
    },
    {
      name: 'Milestones only',
      description: 'Bare timeline under an existing page heading.',
      props: {
        blockType: 'timeline',
        header: { enableHeader: false },
        items,
      },
    },
  ],
}
