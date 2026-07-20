import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const introEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

/**
 * Featured Galleries — a section that surfaces posts which have a photo gallery.
 * Content is NOT hand-picked here: the block queries published posts with a
 * non-empty `gallery`, most-recently-updated first (see Component.tsx). Only the
 * section header + how many to show are configurable.
 */
export const GalleryHighlights: Block = {
  slug: 'galleryHighlights',
  interfaceName: 'GalleryHighlightsBlock',
  labels: { singular: 'Featured Galleries', plural: 'Featured Galleries' },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow / tagline',
      admin: { description: 'Optional label above the heading.' },
    },
    {
      name: 'heading',
      type: 'text',
      admin: { description: 'Optional section heading.' },
    },
    {
      name: 'body',
      type: 'richText',
      editor: introEditor,
      label: 'Intro text',
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'compact',
      label: 'Style',
      options: [
        { label: 'Compact (straight cards)', value: 'compact' },
        { label: 'Polaroid (tilted prints with tape)', value: 'polaroid' },
      ],
      admin: {
        description:
          'Compact is the restrained default. Polaroid tilts and staggers the prints and adds a strip of tape.',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 6,
      min: 1,
      max: 24,
      label: 'How many to show',
      admin: { description: 'Maximum number of recent galleries to display.' },
    },
    {
      name: 'anchorId',
      type: 'text',
      label: 'Anchor ID',
      admin: {
        description:
          'Optional in-page anchor target, e.g. "galleries" makes the section reachable at #galleries.',
      },
    },
  ],
}
