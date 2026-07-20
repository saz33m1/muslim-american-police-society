import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const PricingTiers: Block = {
  slug: 'pricingTiers',
  interfaceName: 'PricingTiersBlock',
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
          admin: {
            description: 'Optional in-page anchor target, e.g. "membership" → #membership.',
          },
        },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      label: 'Columns',
      required: true,
      options: [
        { label: 'Two', value: '2' },
        { label: 'Three', value: '3' },
        { label: 'Four', value: '4' },
      ],
    },
    {
      name: 'plans',
      type: 'array',
      label: 'Plans',
      labels: { singular: 'Plan', plural: 'Plans' },
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: { width: '60%' },
            },
            {
              name: 'price',
              type: 'text',
              label: 'Price',
              admin: { width: '40%', description: 'e.g. "Free" or "$25 / year".' },
            },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Eligibility / description',
        },
        {
          name: 'features',
          type: 'array',
          label: 'Features',
          labels: { singular: 'Feature', plural: 'Features' },
          admin: { initCollapsed: false },
          fields: [{ name: 'feature', type: 'text', required: true }],
        },
        {
          name: 'featured',
          type: 'checkbox',
          label: 'Highlight this plan',
        },
        linkGroup({
          appearances: ['default', 'outline'],
          overrides: {
            label: 'Call to action',
            maxRows: 1,
            admin: { initCollapsed: true },
          },
        }),
      ],
    },
  ],
  labels: {
    plural: 'Pricing Tiers',
    singular: 'Pricing Tiers',
  },
}
