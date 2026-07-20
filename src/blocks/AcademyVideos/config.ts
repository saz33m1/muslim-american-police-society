import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

const introEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

/**
 * Academy Videos — a filterable grid of videos from the AcademyVideos
 * collection, scopeable by category. Each card opens an in-page lightbox player
 * (the embed URL is loaded only on play). Queries the collection on a real page;
 * the gallery feeds it a fixed selection.
 */
export const AcademyVideos: Block = {
  slug: 'academyVideos',
  interfaceName: 'AcademyVideosBlock',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          label: 'Eyebrow / tagline',
          admin: { width: '50%' },
        },
        {
          name: 'heading',
          type: 'text',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'intro',
      type: 'richText',
      editor: introEditor,
      label: 'Intro text',
    },
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        { label: 'Collection', value: 'collection' },
        { label: 'Individual selection', value: 'selection' },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'video-categories',
      hasMany: true,
      label: 'Limit to categories',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'collection',
        description: 'Leave empty to show every category.',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 0,
      label: 'Limit',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'collection',
        description: '0 = show all.',
        step: 1,
      },
    },
    {
      name: 'selectedVideos',
      type: 'relationship',
      relationTo: 'academy-videos',
      hasMany: true,
      label: 'Videos',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'selection',
      },
    },
  ],
  labels: {
    plural: 'Academy Videos',
    singular: 'Academy Videos',
  },
}
