import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const ComparisonTable: Block = {
  slug: 'comparisonTable',
  interfaceName: 'ComparisonTableBlock',
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
          admin: { description: 'Optional in-page anchor target, e.g. "payments" → #payments.' },
        },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Columns',
      labels: { singular: 'Column', plural: 'Columns' },
      minRows: 1,
      admin: {
        initCollapsed: false,
        description: 'The compared options. Cells in each row line up with these, left to right.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '60%' } },
            {
              name: 'icon',
              type: 'upload',
              relationTo: 'media',
              admin: { width: '40%' },
            },
          ],
        },
      ],
    },
    {
      name: 'rows',
      type: 'array',
      label: 'Rows',
      labels: { singular: 'Row', plural: 'Rows' },
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'cells',
          type: 'array',
          label: 'Cells',
          labels: { singular: 'Cell', plural: 'Cells' },
          admin: {
            initCollapsed: false,
            description: 'One cell per column, in the same order as the columns above.',
          },
          fields: [
            {
              name: 'type',
              type: 'select',
              defaultValue: 'check',
              required: true,
              options: [
                { label: 'Check', value: 'check' },
                { label: 'Cross', value: 'cross' },
                { label: 'Text', value: 'text' },
                { label: 'Image (e.g. QR code)', value: 'image' },
              ],
            },
            {
              name: 'text',
              type: 'text',
              admin: { condition: (_, s) => s?.type === 'text' },
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: { condition: (_, s) => s?.type === 'image' },
            },
          ],
        },
      ],
    },
  ],
  labels: {
    plural: 'Comparison Tables',
    singular: 'Comparison Table',
  },
}
