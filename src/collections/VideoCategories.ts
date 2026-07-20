import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { legacyItemId } from '../fields/legacyItemId'
import { slugField } from 'payload'

/**
 * Video Categories — the topic groupings for Academy Videos (the "MAPS Academy
 * Video Categories" Webflow CMS collection). AcademyVideos references this with
 * a `hasMany` relationship; `order` controls the filter-bar order on the videos
 * block. Same shape as TeamCategories.
 */
export const VideoCategories: CollectionConfig = {
  slug: 'video-categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order'],
    group: 'Content',
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 256, // Webflow "Name" PlainText limit (#104)
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers sort first in the filter bar.',
      },
    },
    slugField({
      position: undefined,
    }),
    legacyItemId(),
  ],
}
