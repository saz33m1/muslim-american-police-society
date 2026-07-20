import type { GalleryBlock } from '@/blocks/gallery-types'

const welcome =
  "You're in. Jump straight to events, your profile, member resources, or your state committee below."

export const memberPortalHeroGallery: GalleryBlock = {
  slug: 'memberPortalHero',
  title: 'Member Portal Hero',
  category: 'content',
  description:
    'Personalized member-portal welcome card: a client greeting from Outseta, four action tiles (one opens the Outseta profile modal), and an optional faded photo collage background. Greeting shows "Welcome!" without a signed-in member.',
  variants: [
    {
      name: 'With collage',
      description: 'Faded photo collage as a masked background layer.',
      props: { blockType: 'memberPortalHero', eyebrow: 'Member Portal', welcomeText: welcome, showMosaic: true },
    },
    {
      name: 'No collage',
      description: 'Clean tinted card, no background image.',
      props: { blockType: 'memberPortalHero', eyebrow: 'Member Portal', welcomeText: welcome, showMosaic: false },
    },
  ],
}
