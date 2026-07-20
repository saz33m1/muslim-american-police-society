import type { Media, Team, TeamCategory, TeamBlock as TeamBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

// Mirror the Webflow Team Categories the directory groups/filters on.
const cat = (title: string, slug: string): TeamCategory =>
  ({ id: slug, title, slug }) as unknown as TeamCategory

const board = cat('Board of Directors', 'board-of-directors')
const advisory = cat('Advisory Council', 'advisory-council')
const nyState = cat('MAPS NY', 'new-york-state-committee')
const txState = cat('MAPS TX', 'maps-texas-state-committee')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// Real portrait headshots, copied into tracked public/import/team by the Webflow
// importer — individual portraits so the showroom reads like a real directory.
const portrait = (file: string, name: string): Media => {
  const ext = file.split('.').pop()?.toLowerCase() ?? 'jpg'
  return {
    id: file,
    alt: `Portrait of ${name}`,
    url: `/import/team/${file}`,
    width: 600,
    height: 600,
    mimeType: MIME[ext] ?? 'image/jpeg',
    filename: file,
    updatedAt: '2026-06-23T00:00:00.000Z',
    createdAt: '2026-06-23T00:00:00.000Z',
  } as unknown as Media
}

// The avatar + modal read name/job title/categories/photo/bio; build just those
// and present them as Team docs. Selection mode avoids a DB round-trip here.
// Contact fields are varied (some both, some one, some none) to exercise the
// conditional LinkedIn/email icons. Names/photos are real members; titles are demo.
const member = (
  name: string,
  jobTitle: string,
  categories: TeamCategory[],
  file: string,
  extra: Partial<Team> = {},
): Team =>
  ({
    id: name,
    name,
    jobTitle,
    categories,
    photo: portrait(file, name),
    bio: prose(
      `${name} serves with MAPS National, supporting Muslim Americans across public service.`,
    ),
    ...extra,
  }) as unknown as Team

const members: Team[] = [
  member('Hon. Asim Rehman', 'Board Chair', [board], 'hon-asim-rehman.webp', {
    email: 'asim@example.org',
    linkedin: 'https://www.linkedin.com',
  }),
  member('Fatema Z. Sumar', 'Vice Chair', [board], 'fatema-z-sumar.png', {
    linkedin: 'https://www.linkedin.com',
  }),
  member('Yusufi Vali', 'Treasurer', [board], 'yusufi-vali.png'),
  member('Dr. Hashima Hasan', 'Secretary', [board], 'dr-hashima-hasan.png', {
    email: 'hashima@example.org',
  }),
  member('Hasan Shanawani', 'Director', [board], 'hasan-shanawani.jpg', {
    linkedin: 'https://www.linkedin.com',
  }),
  member('Syra Madad', 'Senior Advisor', [advisory], 'syra-madad.png', {
    email: 'syra@example.org',
    linkedin: 'https://www.linkedin.com',
  }),
  member('Fatiha Ainane', 'Advisor', [advisory], 'fatiha-ainane.webp'),
  member('Ahmad Maaty', 'Advisor', [advisory], 'ahmad-maaty.png', {
    linkedin: 'https://www.linkedin.com',
  }),
  member('Madiha Zuberi', 'Advisor', [advisory], 'madiha-zuberi.webp'),
  member('Omar Aswad', 'Advisor', [advisory], 'omar-aswad.webp', {
    email: 'omar@example.org',
  }),
  member('Hesham El-Meligy', 'President, MAPS New York', [nyState], 'hesham-el-meligy.png', {
    linkedin: 'https://www.linkedin.com',
  }),
  member('Duriba Khan', 'Vice President', [nyState], 'duriba-khan.png'),
  member('Ayyan S. Zubair', 'Committee Member', [nyState], 'ayyan-s-zubair.png', {
    email: 'ayyan@example.org',
  }),
  member('Nancy Moemen', 'Committee Member', [nyState], 'nancy-moemen.png'),
  member('Basem Hassan', 'President, MAPS Texas', [txState], 'basem-hassan.png', {
    linkedin: 'https://www.linkedin.com',
  }),
  member('Saira Amar', 'Vice President', [txState], 'saira-amar.png', {
    email: 'saira@example.org',
  }),
  member('Tamim Chowdhury', 'Committee Member', [txState], 'tamim-chowdhury.png'),
  member('Zunera Ahmed', 'Committee Member', [txState], 'zunera-ahmed.png'),
]

const groupedHeader = {
  enableHeader: true,
  eyebrow: 'Our people',
  heading: 'Leadership & committees',
  body: prose('The board, advisors, and state directors behind the network.'),
}

export const teamGallery: GalleryBlock<TeamBlockProps> = {
  slug: 'team',
  title: 'Team',
  category: 'data',
  description:
    'An editorial directory of the Team collection — chromeless circular portraits with serif names, each opening a bio modal. Grouped into labelled category sections, or one grid with a category filter bar. On a real page it queries the collection; here it renders a fixed set of sample members.',
  variants: [
    {
      name: 'Grouped — medium',
      description:
        'Default. A labelled section per group, all visible. Typical about-us with several committees (~15–25 people).',
      props: {
        blockType: 'team',
        populateBy: 'selection',
        layout: 'grouped',
        density: 'medium',
        header: groupedHeader,
        selectedMembers: members,
      },
    },
    {
      name: 'Grouped — airy',
      description:
        'Fewer per row, more whitespace — for a board, exec team, or single-group page where each person carries weight.',
      props: {
        blockType: 'team',
        populateBy: 'selection',
        layout: 'grouped',
        density: 'airy',
        header: { ...groupedHeader, eyebrow: 'Our board', heading: 'Board of Directors' },
        selectedMembers: members,
      },
    },
    {
      name: 'Tight — full roster',
      description:
        'Small photos, minimal gaps, no bio-hint line — for a full committee roster (30+ people) where scanning names matters more than showcasing faces.',
      props: {
        blockType: 'team',
        populateBy: 'selection',
        layout: 'grouped',
        density: 'tight',
        header: { ...groupedHeader, eyebrow: 'Committee', heading: 'Full committee roster' },
        selectedMembers: members,
      },
    },
    {
      name: 'Filter tabs',
      description:
        'One grid with a category filter bar instead of stacked sections — for pages that prefer filtering to scrolling.',
      props: {
        blockType: 'team',
        populateBy: 'selection',
        layout: 'tabs',
        density: 'compact',
        header: groupedHeader,
        selectedMembers: members,
      },
    },
  ],
}
