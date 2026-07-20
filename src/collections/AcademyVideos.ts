import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { legacyItemId } from '../fields/legacyItemId'
import { slugField } from 'payload'

/**
 * Academy Videos — the MAPS Academy video library (the "MAPS Academy Videos"
 * Webflow CMS collection). Each row is a title plus an embed URL stored
 * verbatim (never fetched server-side) and a category. Thumbnail + description
 * are optional editorial additions; `order` is the source "Ordering 1st".
 *
 * maxLength on `title` mirrors the Webflow "Name" PlainText limit (256, #104);
 * the video URL, description, and order carried no Webflow limit.
 */
export const AcademyVideos: CollectionConfig<'academy-videos'> = {
  slug: 'academy-videos',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'updatedAt'],
    useAsTitle: 'title',
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
      name: 'videoUrl',
      type: 'text',
      required: true,
      label: 'Video URL',
      admin: {
        description: 'Embed/watch URL (e.g. YouTube). Stored verbatim — never fetched.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional short summary shown on the card.' },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional poster image; falls back to a placeholder.' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'video-categories',
      hasMany: true,
      label: 'Categories',
      admin: { description: 'Drives the on-page filter.' },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Within-list sort; lower numbers first.',
      },
    },
    slugField(),
    legacyItemId(),
  ],
}
