import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

const richEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

export const FAQ: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
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
          type: 'row',
          fields: [
            {
              name: 'eyebrow',
              type: 'text',
              label: 'Eyebrow / tagline',
              admin: {
                width: '50%',
                condition: (_, siblingData) => Boolean(siblingData?.enableHeader),
              },
            },
            {
              name: 'heading',
              type: 'text',
              admin: {
                width: '50%',
                condition: (_, siblingData) => Boolean(siblingData?.enableHeader),
              },
            },
          ],
        },
        {
          name: 'body',
          type: 'richText',
          editor: richEditor,
          label: 'Intro text',
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.enableHeader),
          },
        },
        linkGroup({
          appearances: ['default', 'outline'],
          overrides: {
            label: 'Intro buttons',
            maxRows: 2,
            admin: {
              initCollapsed: true,
              condition: (_, siblingData) => Boolean(siblingData?.enableHeader),
            },
          },
        }),
        {
          name: 'anchorId',
          type: 'text',
          label: 'Anchor ID',
          admin: {
            description:
              'Optional in-page anchor target, e.g. "faq" makes the section reachable at #faq. Must be unique on the page.',
          },
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'stacked',
      label: 'Layout',
      required: true,
      admin: {
        description:
          'Stacked: header sits above the questions. Side by side: header in a left column, questions on the right.',
      },
      options: [
        { label: 'Stacked', value: 'stacked' },
        { label: 'Side by side', value: 'sideBySide' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Questions',
      labels: { singular: 'Question', plural: 'Questions' },
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'group',
          type: 'text',
          label: 'Group',
          admin: {
            description:
              'Optional subheading. A heading renders above this question whenever its group differs from the previous question’s — leave blank for a flat list.',
          },
        },
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          editor: richEditor,
          required: true,
          label: false,
        },
        {
          name: 'defaultOpen',
          type: 'checkbox',
          label: 'Expanded by default',
        },
      ],
    },
  ],
  labels: {
    plural: 'FAQs',
    singular: 'FAQ',
  },
}
