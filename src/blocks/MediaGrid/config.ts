import type { Block } from 'payload'

export const MediaGrid: Block = {
  slug: 'mediaGrid',
  interfaceName: 'MediaGridBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      admin: { description: 'Optional label above the grid.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'columns',
          type: 'select',
          defaultValue: '3',
          label: 'Columns',
          required: true,
          admin: {
            width: '50%',
            description: 'Number of columns. In Compact, this caps the photo-wall column count.',
          },
          options: [
            { label: 'Two', value: '2' },
            { label: 'Three', value: '3' },
            { label: 'Four', value: '4' },
          ],
        },
        {
          name: 'density',
          type: 'select',
          defaultValue: 'comfortable',
          label: 'Density',
          required: true,
          admin: {
            width: '50%',
            description:
              'Comfortable: 4:3 tiles at the chosen column count. Compact: small 4:3 tiles, tighter gaps, best for a dense photo wall.',
          },
          options: [
            { label: 'Comfortable', value: 'comfortable' },
            { label: 'Compact: dense photo wall', value: 'compact' },
          ],
        },
      ],
    },
    {
      name: 'enableLightbox',
      type: 'checkbox',
      defaultValue: true,
      label: 'Open images in a lightbox',
      admin: {
        description:
          'Let visitors click an image to view it full-size in an overlay, with next/previous.',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Images',
      labels: { singular: 'Image', plural: 'Images' },
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption',
          admin: { description: 'Shown in the lightbox and used as the alt text fallback.' },
        },
      ],
    },
  ],
  labels: {
    plural: 'Image Grids',
    singular: 'Image Grid',
  },
}
