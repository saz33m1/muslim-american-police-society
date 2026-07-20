import type { Page } from '@/payload-types'
import type { GalleryHero } from '@/blocks/gallery-types'

import {
  heading,
  paragraph,
  prose,
  richText,
  sampleCapitol,
  sampleCityHall,
  sampleSenate,
} from '@/blocks/gallery-helpers'

type HeroData = Page['hero']

const link = (label: string, appearance: 'default' | 'outline' = 'default') => ({
  link: { type: 'custom' as const, url: '#', label, newTab: false, appearance },
})

const highImpactHeroGallery: GalleryHero<HeroData> = {
  type: 'highImpact',
  title: 'High Impact',
  description:
    'Full-bleed hero with a background image, navy gradient scrim, centered white copy and action buttons. The primary page intro (sets the header to dark).',
  variants: [
    {
      name: 'With navy gradient overlay',
      description: 'Default overlay — lifts text contrast over imagery.',
      props: {
        type: 'highImpact',
        media: sampleCapitol,
        overlay: 'navy-gradient',
        richText: richText(
          heading('Empowering Muslim American Public Servants', 'h1'),
          paragraph(
            'At MAPS, we foster a supportive community for Muslim American public servants, helping them excel in their careers and personal growth.',
          ),
        ),
        links: [link('Become a member'), link('Explore programs', 'outline')],
      },
    },
    {
      name: 'No overlay',
      description: 'Overlay disabled — raw image behind the copy.',
      props: {
        type: 'highImpact',
        media: sampleSenate,
        overlay: 'none',
        richText: richText(
          heading('Serving the community and the country', 'h1'),
          paragraph('Use when the image is already dark enough for legible text.'),
        ),
        links: [link('Join MAPS')],
      },
    },
  ],
}

const mediumImpactHeroGallery: GalleryHero<HeroData> = {
  type: 'mediumImpact',
  title: 'Medium Impact',
  description:
    'Split hero on a full-bleed lightest-neutral masthead band: heading, copy and buttons on the left with a contained aspect-video image on the right (stacks on mobile). Lighter than High Impact, heavier than a mini-header.',
  variants: [
    {
      name: 'With captioned image',
      description: 'Two-column split intro; image stacks below the text on mobile.',
      props: {
        type: 'mediumImpact',
        media: {
          ...sampleCityHall,
          caption: prose('MAPS members gathered at a city hall reception.'),
        },
        richText: richText(
          heading('Advance your career, serve your community and country', 'h2'),
          paragraph('Comprehensive career support resources for public servants at all levels.'),
        ),
        links: [link('Explore programs'), link('Become a member', 'outline')],
      },
    },
  ],
}

const lowImpactHeroGallery: GalleryHero<HeroData> = {
  type: 'lowImpact',
  title: 'Low Impact',
  description:
    'Mini-header for interior pages: a constrained rich-text intro, no media. Optional eyebrow, breadcrumb trail, and up to two CTAs. The default for section and landing-page headers.',
  variants: [
    {
      name: 'Text only',
      props: {
        type: 'lowImpact',
        richText: richText(
          heading('Mission, Values & History', 'h2'),
          paragraph(
            'MAPS is a 501(c)(3) non-profit building a network of Muslim American public servants across federal, state, and local government.',
          ),
        ),
      },
    },
    {
      name: 'Eyebrow, breadcrumb & CTAs',
      description: 'Full interior-page header: trail, tagline, intro, and actions.',
      props: {
        type: 'lowImpact',
        eyebrow: 'Member Portal',
        breadcrumbs: [
          { label: 'Member Portal', url: '#' },
          { label: 'Professional Development' },
        ],
        richText: richText(
          heading('Recent MAPS Academy Programs', 'h2'),
          paragraph(
            'Browse our collection of recorded sessions from internal and public career programs.',
          ),
        ),
        links: [link('Browse the catalog'), link('Back to portal', 'outline')],
      },
    },
  ],
}

/**
 * Heros rendered by the gallery, in display order. See `gallery-types.ts` for
 * the convention. Render-side only — not imported into the Payload config graph.
 */
// Heterogeneous hero data shapes; rendered through RenderHero (a loose props type).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const galleryHeros: GalleryHero<any>[] = [
  highImpactHeroGallery,
  mediumImpactHeroGallery,
  lowImpactHeroGallery,
]
