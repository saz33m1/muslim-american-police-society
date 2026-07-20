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
 * Testimonials — quotes from the Testimonials collection, scopeable to a `type`
 * (career / programs). Rendered as an autoplaying pull-quote slider. Sourced
 * from the collection on a real page; the gallery feeds it a fixed selection.
 */
export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
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
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'all',
      label: 'Filter by type',
      admin: { width: '50%' },
      options: [
        { label: 'All', value: 'all' },
        { label: 'Career', value: 'career' },
        { label: 'Programs', value: 'programs' },
      ],
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
      name: 'selectedTestimonials',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
      label: 'Testimonials',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'selection',
      },
    },
  ],
  labels: {
    plural: 'Testimonials',
    singular: 'Testimonials',
  },
}
