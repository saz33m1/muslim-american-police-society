import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const Timeline: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  fields: [
    {
      name: 'header',
      type: 'group',
      label: 'Header',
      admin: { hideGutter: true },
      fields: [
        {
          name: 'enableHeader',
          type: 'checkbox',
          defaultValue: true,
          label: 'Show section header',
        },
        {
          name: 'heading',
          type: 'text',
          admin: { condition: (_, s) => Boolean(s?.enableHeader) },
        },
        {
          name: 'body',
          type: 'richText',
          editor: richEditor,
          label: 'Intro text',
          admin: { condition: (_, s) => Boolean(s?.enableHeader) },
        },
        {
          name: 'anchorId',
          type: 'text',
          label: 'Anchor ID',
          admin: { description: 'Optional in-page anchor target, e.g. "history" → #history.' },
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Milestones',
      labels: { singular: 'Milestone', plural: 'Milestones' },
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'date',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "2019", "January 2021".' },
        },
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'body',
          type: 'richText',
          editor: richEditor,
          label: false,
        },
      ],
    },
  ],
  labels: {
    plural: 'Timelines',
    singular: 'Timeline',
  },
}
