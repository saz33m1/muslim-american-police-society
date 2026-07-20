import type { CollectionConfig, PayloadRequest } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import { stampGalleryUpdatedAt } from './hooks/stampGalleryUpdatedAt'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from 'payload'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    heroImage: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'posts',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              label: 'Image',
              relationTo: 'media',
              required: true,
              admin: {
                description:
                  'Must be square (1:1) sized, at least 1080x1080 px. Adjust focal point as needed.',
              },
              validate: async (
                value: unknown,
                { req, previousValue }: { req: PayloadRequest; previousValue?: unknown },
              ) => {
                // A custom validate replaces Payload's default one, which is what
                // enforces `required` — so re-check emptiness here. Draft saves skip
                // validation, so this only blocks publishing without a hero.
                if (!value) return 'Hero image is required.'
                const toId = (v: unknown) =>
                  typeof v === 'object' && v !== null ? (v as { id: number }).id : v
                // Grandfather an unchanged hero: only enforce dimensions when the image
                // is being set or changed. Otherwise a post with a legacy non-square or
                // sub-1080 hero can't be saved at all (e.g. to toggle sticky) without
                // swapping the image.
                if (previousValue != null && toId(value) === toId(previousValue)) return true
                const media = await req.payload.findByID({
                  collection: 'media',
                  id: toId(value) as number,
                  req,
                })
                if (media?.width && media?.height) {
                  if (media.width !== media.height) {
                    return 'Hero image must be square (1:1 aspect ratio).'
                  }
                  if (media.width < 1080) {
                    return 'Hero image must be at least 1080×1080 pixels.'
                  }
                }
                return true
              },
            },
            {
              name: 'gallery',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              admin: {
                description: 'Optional. Extra photos shown in a gallery on the post.',
              },
            },
            {
              name: 'galleryCover',
              type: 'upload',
              relationTo: 'media',
              label: 'Gallery cover',
              admin: {
                description:
                  'Optional. Which gallery photo represents this gallery in the Featured Galleries section. Defaults to the first gallery photo.',
                // Only relevant once there are gallery photos to choose from.
                condition: (_, siblingData) =>
                  Array.isArray(siblingData?.gallery) && siblingData.gallery.length > 0,
              },
              // Restrict the picker to photos already in THIS post's gallery, so the
              // cover is always "one of the children" (not any Media doc).
              filterOptions: ({ data }) => {
                const ids = ((data?.gallery as unknown[]) ?? [])
                  .map((g) => (g && typeof g === 'object' ? (g as { id: number }).id : g))
                  .filter((id): id is number => typeof id === 'number')
                return ids.length ? { id: { in: ids } } : false
              },
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: 'Body',
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
                description: 'Optional. Hand-pick posts to feature as related.',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              required: true,
              admin: {
                position: 'sidebar',
                description:
                  'Required. Choose one category. Controls where the post appears in listings and filters.',
              },
              hasMany: true,
              // Cap at one: keeps the array type (no schema/consumer changes) while
              // the admin UI + validation allow only a single category.
              maxRows: 1,
              relationTo: 'categories',
            },
          ],
          label: 'Meta',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
              hasGenerateFn: true,
            }),

            MetaDescriptionField({
              hasGenerateFn: true,
            }),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Leave blank or set to future.',
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'sticky',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Pin this post to the top of the listing.',
      },
    },
    {
      name: 'galleryUpdatedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Auto-set when the photo gallery changes. Drives ordering in the Featured Galleries block.',
      },
      // Written by the stampGalleryUpdatedAt beforeChange hook, never by hand.
    },
    {
      name: 'membersOnlyUrl',
      type: 'text',
      label: 'Members-only URL',
      // Gated link, so keep it out of the public REST/GraphQL API — only
      // authenticated requests get the value. Server-rendered listings use the
      // Local API (access overridden by default), so the portal still reads it.
      access: { read: ({ req: { user } }) => Boolean(user) },
      admin: {
        position: 'sidebar',
        description: 'Only shown to members.',
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      // Pre-fill the current user on create; still editable (add/remove bylines).
      defaultValue: ({ user }) => (user ? [user.id] : undefined),
      admin: {
        position: 'sidebar',
        description: 'Internal only. Not shown on the website.',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    slugField(),
  ],
  hooks: {
    beforeChange: [stampGalleryUpdatedAt],
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
