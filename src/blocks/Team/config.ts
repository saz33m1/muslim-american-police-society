import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const introEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

/**
 * Team — an editorial directory of the Team collection: chromeless circular
 * headshots floating on the page, each opening a bio modal. Two layouts: grouped
 * (a labelled section per category) or tabs (one grid with a category filter bar).
 */
export const Team: Block = {
  slug: 'team',
  interfaceName: 'TeamBlock',
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
          editor: introEditor,
          label: 'Intro text',
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.enableHeader),
          },
        },
        {
          name: 'anchorId',
          type: 'text',
          label: 'Anchor ID',
          admin: {
            description:
              'Optional in-page anchor target, e.g. "team" makes the section reachable at #team. Must be unique on the page.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'layout',
          type: 'select',
          defaultValue: 'grouped',
          label: 'Layout',
          required: true,
          admin: {
            width: '50%',
            description:
              'Grouped: a labelled section per category, all visible. Tabs: one grid with a category filter bar.',
          },
          options: [
            { label: 'Grouped sections', value: 'grouped' },
            { label: 'Filter tabs', value: 'tabs' },
          ],
        },
        {
          name: 'density',
          type: 'select',
          defaultValue: 'medium',
          label: 'Density',
          required: true,
          admin: {
            width: '50%',
            description:
              'People per row. Airy: boards & leadership (few people). Medium: a general about-us. Compact: large committees you scan in bulk. Tight: a full committee roster (many people, small photos, no bio hint).',
          },
          options: [
            { label: 'Airy — boards & leadership', value: 'airy' },
            { label: 'Medium — general team page', value: 'medium' },
            { label: 'Compact — large committees', value: 'compact' },
            { label: 'Tight — full committee rosters', value: 'tight' },
          ],
        },
      ],
    },
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        { label: 'Collection', value: 'collection' },
        { label: 'Individual selection', value: 'selection' },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'team-categories',
      hasMany: true,
      label: 'Limit to groups',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'collection',
        description: 'Leave empty to show every group.',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 0,
      label: 'Limit',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'collection',
        description: '0 = show everyone.',
        step: 1,
      },
    },
    {
      name: 'selectedMembers',
      type: 'relationship',
      relationTo: 'team',
      hasMany: true,
      label: 'Members',
      admin: {
        condition: (_, siblingData) => siblingData?.populateBy === 'selection',
      },
    },
  ],
  labels: {
    plural: 'Team',
    singular: 'Team',
  },
}
