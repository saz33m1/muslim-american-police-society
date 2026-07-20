import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const ContactDetails: Block = {
  slug: 'contactDetails',
  interfaceName: 'ContactDetailsBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
    },
    {
      name: 'intro',
      type: 'richText',
      editor: richEditor,
      label: 'Intro text',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Contact items',
      labels: { singular: 'Item', plural: 'Items' },
      minRows: 1,
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'email',
          required: true,
          options: [
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'phone' },
            { label: 'Location', value: 'location' },
            { label: 'Hours', value: 'clock' },
            { label: 'Link', value: 'link' },
          ],
        },
        {
          name: 'label',
          type: 'text',
          admin: { description: 'Optional small label above the value, e.g. "Email".' },
        },
        {
          name: 'value',
          type: 'textarea',
          required: true,
          admin: { description: 'The address, email, phone, or text. Line breaks are preserved.' },
        },
        {
          name: 'href',
          type: 'text',
          label: 'Link (optional)',
          admin: {
            description:
              'Leave empty to auto-link email and phone values. Set explicitly for a custom link.',
          },
        },
      ],
    },
  ],
  labels: {
    plural: 'Contact Details',
    singular: 'Contact Details',
  },
}
