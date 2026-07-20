import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { legacyItemId } from '../fields/legacyItemId'
import { slugField } from 'payload'

/**
 * Team Categories — the groups a Team member belongs to (Board of Directors,
 * Advisory Council, the state committees, etc.). A member can be in several, so
 * Team references this with a `hasMany` relationship. Mirrors the Webflow "Team
 * Categories" CMS collection. `order` controls section order on directory pages.
 */
export const TeamCategories: CollectionConfig = {
  slug: 'team-categories',
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
        description: 'Lower numbers sort first on directory pages.',
      },
    },
    slugField({
      position: undefined,
    }),
    legacyItemId(),
  ],
}
