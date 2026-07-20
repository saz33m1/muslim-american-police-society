import type { Field, PayloadRequest } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Type',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    {
      name: 'eyebrow',
      type: 'text',
      admin: {
        condition: (_, { type } = {}) => type === 'lowImpact',
        description: 'Small tagline shown above the heading on interior-page headers.',
      },
      label: 'Eyebrow',
    },
    {
      name: 'breadcrumbs',
      type: 'array',
      admin: {
        condition: (_, { type } = {}) => type === 'lowImpact',
        description:
          'Optional trail above the heading. The last crumb is the current page — leave its URL empty.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            description: 'Leave empty for the current page (rendered as plain text).',
          },
        },
      ],
      label: 'Breadcrumbs',
    },
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'media',
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
        description:
          'Medium Impact needs a 4:3 landscape image (e.g. 1600×1200) so the split frame fills with no crop.',
      },
      relationTo: 'media',
      required: true,
      // Require a 4:3 landscape image for the Medium Impact split hero, whose
      // frame is fixed at aspect-[4/3]; a mismatched ratio gets cropped (and
      // letterboxed sources lose their subject). highImpact is full-bleed, so it
      // is exempt. Validation also covers the required check for both types.
      validate: async (
        value: unknown,
        { req, siblingData }: { req: PayloadRequest; siblingData?: { type?: string } },
      ) => {
        const type = siblingData?.type
        if (type !== 'highImpact' && type !== 'mediumImpact') return true
        if (!value) return 'A hero image is required.'
        if (type !== 'mediumImpact') return true

        const doc =
          value && typeof value === 'object'
            ? (value as { width?: number; height?: number })
            : await req.payload
                .findByID({ collection: 'media', id: value as string | number, depth: 0 })
                .catch(() => null)
        const width = doc?.width
        const height = doc?.height
        if (!width || !height) return true

        const ratio = width / height
        const target = 4 / 3
        if (Math.abs(ratio - target) > target * 0.03) {
          return `Use a 4:3 landscape image (e.g. 1600×1200). This one is ${width}×${height} (${ratio.toFixed(2)}:1).`
        }
        return true
      },
    },
    {
      name: 'overlay',
      type: 'select',
      defaultValue: 'navy-gradient',
      label: 'Background overlay',
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description: 'Navy scrim over the hero image for text legibility (brand-token gradient).',
      },
      options: [
        {
          label: 'Navy gradient',
          value: 'navy-gradient',
        },
        {
          label: 'None',
          value: 'none',
        },
      ],
    },
  ],
  label: false,
}
