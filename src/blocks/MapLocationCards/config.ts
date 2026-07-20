import type { Block } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

const introEditor = lexicalEditor({
  features: ({ rootFeatures }) => [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()],
})

/**
 * Map + Location Cards — a list of locations (name, address, contact, link)
 * alongside an optional embedded map.
 *
 * Map provider decision (#70, revised for JU1): Google Maps JavaScript API,
 * loaded client-side, dropping one marker per location that has lat/lng — so a
 * multi-location page shows every pin, not a single generic place. Keyed by
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and env-gated like the S3 adapter: with no key
 * (or no geocoded locations) the map is omitted and the block degrades to
 * cards-only with no error. `enableMap` lets an editor opt out even when a key
 * is configured. Locations are inline array fields (there's no Webflow CMS
 * source for them), not a separate collection.
 */
export const MapLocationCards: Block = {
  slug: 'mapLocationCards',
  interfaceName: 'MapLocationCardsBlock',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          label: 'Eyebrow / tagline',
          admin: { width: '50%' },
        },
        {
          name: 'heading',
          type: 'text',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'intro',
      type: 'richText',
      editor: introEditor,
      label: 'Intro text',
    },
    {
      name: 'enableMap',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show map',
      admin: {
        description:
          'Renders an embedded map when a Google Maps API key is configured. With no key, the block shows cards only regardless of this setting.',
      },
    },
    {
      // Deprecated by JU1: the map now centers on the location pins (fitBounds),
      // so this is no longer read. Kept (hidden) only so the DB column isn't
      // dropped — removing it would trigger a destructive schema push.
      name: 'mapQuery',
      type: 'text',
      label: 'Map center',
      admin: {
        hidden: true,
        description: 'Deprecated — the map centers on the location pins.',
      },
    },
    {
      name: 'locations',
      type: 'array',
      minRows: 1,
      labels: { plural: 'Locations', singular: 'Location' },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'address',
          type: 'textarea',
          admin: { description: 'Shown on the card and used as the map center fallback.' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              admin: { width: '50%' },
            },
            {
              name: 'email',
              type: 'text',
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'linkLabel',
              type: 'text',
              label: 'Link label',
              admin: { width: '50%' },
            },
            {
              name: 'linkUrl',
              type: 'text',
              label: 'Link URL',
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'lat',
              type: 'number',
              label: 'Latitude',
              admin: {
                width: '50%',
                description: 'Decimal degrees. With lng, drops a map pin for this location.',
              },
            },
            {
              name: 'lng',
              type: 'number',
              label: 'Longitude',
              admin: { width: '50%', description: 'Decimal degrees.' },
            },
          ],
        },
      ],
    },
  ],
  labels: {
    plural: 'Map + Location Cards',
    singular: 'Map + Location Cards',
  },
}
