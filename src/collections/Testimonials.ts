import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { legacyItemId } from '../fields/legacyItemId'
import { slugField } from 'payload'

/**
 * Testimonials — quotes behind the testimonials block. One collection covers
 * both Webflow source CSVs ("Testimonials (Career)" and "Testimonials
 * (Programs)"); the `type` select is the discriminator, so no separate category
 * collection. The source rows carry only a name + the quote text; role,
 * affiliation, and headshot are optional editorial additions the block can show
 * when present.
 *
 * maxLength on `author` mirrors the Webflow "Name" PlainText limit (256, #104);
 * the quote is rich text and the Webflow "Testimonial" PlainText field carried
 * no limit, so both stay unbounded.
 */
export const Testimonials: CollectionConfig<'testimonials'> = {
  slug: 'testimonials',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['author', 'type', 'updatedAt'],
    useAsTitle: 'author',
    group: 'Content',
  },
  defaultSort: 'author',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'author',
          type: 'text',
          required: true,
          maxLength: 256, // Webflow "Name" PlainText limit (#104)
          admin: { width: '50%', description: 'Person being quoted.' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'career',
          admin: {
            width: '50%',
            description: 'Which source the testimonial belongs to. Drives block filtering.',
          },
          options: [
            { label: 'Career', value: 'career' },
            { label: 'Programs', value: 'programs' },
          ],
        },
      ],
    },
    {
      name: 'role',
      type: 'text',
      label: 'Role / affiliation',
      admin: { description: 'Optional — e.g. "Program graduate" or an employer.' },
    },
    {
      name: 'quote',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    {
      name: 'headshot',
      type: 'upload',
      relationTo: 'media',
      label: 'Headshot',
    },
    slugField(),
    legacyItemId(),
  ],
}
