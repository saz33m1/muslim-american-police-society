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
 * Team — the people directory behind the team-grid block. Schema mirrors the
 * Webflow "Team Members" CMS collection: a primary + optional secondary job
 * title, a headshot, contact links, a rich-text bio, and one or more Team
 * Categories (a member can sit on several committees). `order` drives the
 * within-group sort. Shown as a filterable grid with a per-member bio modal.
 */
export const Team: CollectionConfig<'team'> = {
  slug: 'team',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'jobTitle', 'updatedAt'],
    useAsTitle: 'name',
    group: 'Content',
  },
  defaultSort: 'name',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 256, // Webflow "Name" PlainText limit (#104)
    },
    {
      type: 'row',
      fields: [
        {
          name: 'jobTitle',
          type: 'text',
          label: 'Job title',
          admin: { width: '50%', description: 'Primary role, e.g. "Executive Director".' },
        },
        {
          name: 'jobTitleSecondary',
          type: 'text',
          label: 'Job title (secondary)',
          admin: { width: '50%', description: 'Optional second role or affiliation.' },
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'team-categories',
      hasMany: true,
      label: 'Team categories',
      admin: {
        description: 'Groups this member belongs to. Drives the on-page filter.',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Headshot',
    },
    {
      name: 'bio',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
      admin: { description: 'Shown in the member detail modal.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'text',
          admin: { width: '50%' },
        },
        {
          name: 'linkedin',
          type: 'text',
          label: 'LinkedIn URL',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'order',
          type: 'number',
          label: 'Order',
          admin: {
            width: '50%',
            description: 'Within-group sort; lower numbers first.',
          },
        },
        {
          name: 'orderSecondary',
          type: 'number',
          label: 'Order (secondary)',
          admin: {
            width: '50%',
            description: 'Tie-breaker sort for a second group.',
          },
        },
      ],
    },
    {
      name: 'inactive',
      type: 'checkbox',
      defaultValue: false,
      label: 'Inactive (hidden)',
      admin: {
        position: 'sidebar',
        description: 'Hide this member from every team grid without deleting them.',
      },
    },
    slugField(),
    legacyItemId(),
  ],
}
