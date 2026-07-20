import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const FeatureSplit: Block = {
  slug: 'featureSplit',
  interfaceName: 'FeatureSplitBlock',
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
          name: 'imageSide',
          type: 'select',
          defaultValue: 'right',
          label: 'Image side',
          required: true,
          admin: {
            width: '50%',
            description: 'Which side the image sits on (desktop). Alternate it on stacked sections.',
          },
          options: [
            { label: 'Right', value: 'right' },
            { label: 'Left', value: 'left' },
          ],
        },
      ],
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'richText',
      editor: richEditor,
      label: 'Body',
    },
    linkGroup({
      appearances: ['default', 'outline'],
      overrides: {
        maxRows: 2,
        admin: { initCollapsed: true },
      },
    }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'anchorId',
      type: 'text',
      label: 'Anchor ID',
      admin: {
        description:
          'Optional in-page anchor target, e.g. "networking" makes the section reachable at #networking. Must be unique on the page.',
      },
    },
  ],
  labels: {
    plural: 'Feature Splits',
    singular: 'Feature Split',
  },
}
