import type { Block } from 'payload'

import { link } from '@/fields/link'

export const LogoStrip: Block = {
  slug: 'logoStrip',
  interfaceName: 'LogoStripBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      admin: {
        description:
          'Optional label above the logos, e.g. "Trusted by organizations across the nation".',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      label: 'Layout',
      required: true,
      admin: {
        description:
          'Grid: a static wrapped row. Marquee: a continuous auto-scrolling strip (pauses on hover, respects reduced-motion).',
      },
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Marquee', value: 'marquee' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Logos',
      labels: { singular: 'Logo', plural: 'Logos' },
      minRows: 1,
      admin: {
        initCollapsed: true,
        components: { RowLabel: '@/blocks/LogoStrip/RowLabel#LogoRowLabel' },
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'size',
          type: 'select',
          defaultValue: 'default',
          label: 'Size',
          admin: {
            description:
              'Per-logo visual size nudge for eyeballing. The box auto-fits any shape, so this only scales how large the logo reads — bump a mark that looks too small up, or a heavy wordmark down.',
          },
          options: [
            { label: 'XS', value: 'xs' },
            { label: 'Small', value: 'small' },
            { label: 'Default', value: 'default' },
            { label: 'Large', value: 'large' },
            { label: 'XL', value: 'xl' },
          ],
        },
        {
          name: 'enableLink',
          type: 'checkbox',
          label: 'Link the logo',
        },
        link({
          appearances: false,
          disableLabel: true,
          overrides: {
            name: 'link',
            admin: {
              condition: (_, siblingData) => Boolean(siblingData?.enableLink),
            },
          },
        }),
      ],
    },
  ],
  labels: {
    plural: 'Logo Strips',
    singular: 'Logo Strip',
  },
}
