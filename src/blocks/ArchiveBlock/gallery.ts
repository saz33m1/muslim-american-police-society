import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose, sampleNetworking, sampleSpeaker, sampleSummit } from '@/blocks/gallery-helpers'

// The post Card reads only slug/title/meta/categories; build just those fields
// and present them as a Post. Avoids a DB round-trip in the gallery.
const mockPost = (
  title: string,
  slug: string,
  description: string,
  category: string,
  image = sampleSpeaker,
): { relationTo: 'posts'; value: Post } => ({
  relationTo: 'posts',
  value: {
    title,
    slug,
    meta: { image, description },
    categories: [{ title: category }],
  } as unknown as Post,
})

export const archiveGallery: GalleryBlock<ArchiveBlockProps> = {
  slug: 'archive',
  title: 'Archive',
  category: 'data',
  description:
    'A grid of post cards. On a real page it queries the Posts collection; here it renders a fixed selection of sample posts.',
  variants: [
    {
      name: 'Selected posts (3)',
      description: 'Selection mode with an intro and three sample posts.',
      props: {
        blockType: 'archive',
        populateBy: 'selection',
        introContent: prose(
          'Latest updates from MAPS, including statements, press releases, events, and professional development.',
        ),
        selectedDocs: [
          mockPost(
            'MAPS members gather at the U.S. Capitol',
            'capitol-gathering',
            'Public servants from across the country convened in Washington, D.C.',
            'Events',
            sampleSpeaker,
          ),
          mockPost(
            'MAPS Academy training series returns',
            'academy-training-series',
            'Career support and professional development for every level of government.',
            'Programs',
            sampleSummit,
          ),
          mockPost(
            'Building community in public service',
            'community-in-public-service',
            'Local chapters and federal employee resource groups continue to grow.',
            'Membership',
            sampleNetworking,
          ),
        ],
      },
    },
  ],
}
