import type {
  AcademyVideo,
  AcademyVideosBlock as AcademyVideosBlockProps,
  VideoCategory,
} from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

// Mirror the MAPS Academy Video Categories the grid filters on.
const cat = (title: string, slug: string): VideoCategory =>
  ({ id: slug, title, slug }) as unknown as VideoCategory

const fundamentals = cat('Fundamentals & Career Entry', 'fundamentals')
const pathways = cat('Executive & Senior Pathways', 'pathways')
const policy = cat('Policy & Advocacy', 'policy')

// Real YouTube watch URLs (resolved to embeds by the block); no thumbnails, so
// the showroom renders the brand-tint placeholder with a play affordance.
const video = (
  title: string,
  url: string,
  categories: VideoCategory[],
  description?: string,
): AcademyVideo =>
  ({
    id: title,
    title,
    videoUrl: url,
    categories,
    ...(description ? { description } : {}),
  }) as unknown as AcademyVideo

const videos: AcademyVideo[] = [
  video(
    'Pipelines into Foreign Policy — CFR Fellowship & Term Member Programs',
    'https://www.youtube.com/watch?v=9brMSH0HuBc',
    [pathways],
    'An info session on the Council on Foreign Relations fellowship and term-member tracks.',
  ),
  video(
    'Breaking into Public Service: Where to Start',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    [fundamentals],
    'The entry points, timelines, and first moves for a public-service career.',
  ),
  video(
    'Workplace Accommodation, Rights & Issues',
    'https://www.youtube.com/watch?v=oHg5SJYRHA0',
    [policy],
  ),
  video(
    'Senior Official Pathways: A Panel',
    'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    [pathways],
  ),
  video(
    'Resume & Application Fundamentals',
    'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    [fundamentals],
  ),
  video('Advocacy 101', 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', [policy]),
]

export const academyVideosGallery: GalleryBlock<AcademyVideosBlockProps> = {
  slug: 'academyVideos',
  title: 'Academy Videos',
  category: 'media',
  description:
    'A filterable grid of MAPS Academy videos, scopeable by category, each opening a lightbox player. On a real page it queries the AcademyVideos collection; here it renders a fixed selection (placeholder thumbnails).',
  variants: [
    {
      name: 'Filterable grid',
      description: 'Default. A category filter bar over a thumbnail grid; cards open a player.',
      props: {
        blockType: 'academyVideos',
        populateBy: 'selection',
        eyebrow: 'MAPS Academy',
        heading: 'Watch & learn',
        intro: prose('Sessions and panels on public service, policy, and career pathways.'),
        selectedVideos: videos,
      },
    },
    {
      name: 'No header',
      description: 'Bare grid — for embedding under an existing page heading.',
      props: {
        blockType: 'academyVideos',
        populateBy: 'selection',
        selectedVideos: videos,
      },
    },
  ],
}
