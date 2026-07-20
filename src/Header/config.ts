import type { Field, GlobalConfig } from 'payload'

import { revalidateHeader } from './hooks/revalidateHeader'

const linkFields = (): Field[] => [
  { name: 'label', type: 'text', required: true },
  {
    name: 'href',
    type: 'text',
    required: true,
    admin: { description: 'Path or URL, e.g. /about-us/mission or https://external.org' },
  },
]

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navGroups',
      type: 'array',
      label: 'Menu sections',
      // 5-column overlay grid (xl:grid-cols-5); a 6th section wraps.
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: { RowLabel: '@/Header/RowLabel#RowLabel' },
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'href',
          type: 'text',
          admin: {
            description: 'Optional. Makes the section title itself a link to a hub/landing page.',
          },
        },
        {
          name: 'gated',
          type: 'checkbox',
          admin: {
            description: 'Members-only: shows a lock icon on links and the account control.',
          },
        },
        {
          name: 'items',
          type: 'array',
          fields: linkFields(),
          admin: {
            initCollapsed: true,
            components: { RowLabel: '@/Header/RowLabel#RowLabel' },
          },
        },
      ],
    },
    {
      name: 'flatLinks',
      type: 'array',
      label: 'Bottom-row links',
      admin: {
        initCollapsed: true,
        components: { RowLabel: '@/Header/RowLabel#RowLabel' },
      },
      fields: linkFields(),
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
