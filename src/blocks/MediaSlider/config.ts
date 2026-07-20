import type { Block } from 'payload'

export const MediaSlider: Block = {
  slug: 'mediaSlider',
  interfaceName: 'MediaSliderBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      admin: { description: 'Optional label above the slider.' },
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
    plural: 'Image Sliders',
    singular: 'Image Slider',
  },
}
