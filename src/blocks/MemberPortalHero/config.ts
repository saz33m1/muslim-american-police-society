import type { Block } from 'payload'

// Member portal landing hero. The four action tiles are fixed in the component
// (wired to in-page sections + the Outseta profile modal), so the editable
// surface is just the eyebrow, the one-line welcome, and the collage toggle.
export const MemberPortalHero: Block = {
  slug: 'memberPortalHero',
  interfaceName: 'MemberPortalHeroBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'Member Portal',
    },
    {
      name: 'welcomeText',
      type: 'textarea',
      label: 'Welcome sentence',
      admin: {
        description: 'Short line under the greeting. The "Welcome, {name}!" line is generated client-side.',
      },
    },
    {
      name: 'showMosaic',
      type: 'checkbox',
      label: 'Show faded photo collage background',
      defaultValue: true,
    },
  ],
  labels: { singular: 'Member Portal Hero', plural: 'Member Portal Heroes' },
}
