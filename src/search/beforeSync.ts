import { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { PayloadRequest, Where } from 'payload'

// Max plaintext stored per search doc. Keeps search rows sane; ILIKE over ~15k
// chars is still cheap at this content volume.
const CONTENT_CAP = 15000

// Object keys whose string values are structural, not prose (ids, urls, enum
// selects). Skipping them keeps the indexed text clean and avoids recursing
// into relationship refs.
const SKIP_KEYS = new Set([
  'id',
  'blockType',
  'blockName',
  'type',
  'relationTo',
  'appearance',
  'anchorId',
  'href',
  'url',
  'linkUrl',
  'icon',
  'lucideIcon',
  'size',
  'newTab',
  'reference',
])

const isLexical = (v: unknown): v is { root: unknown } =>
  !!v && typeof v === 'object' && 'root' in v && typeof (v as { root?: unknown }).root === 'object'

// ponytail: generic recursive walk collects every richText + prose string under
// a node, so any current OR future page block is indexed with no per-block code.
// Denylist above filters obvious noise; tighten it if junk shows up in results.
const collectText = (value: unknown, key: string, out: string[]): void => {
  if (value == null || SKIP_KEYS.has(key)) return
  if (isLexical(value)) {
    out.push(convertLexicalToPlaintext({ data: value as SerializedEditorState }))
  } else if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectText(item, key, out)
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectText(v, k, out)
  }
}

// Team members live in their own collection and are placed on a page by a `team`
// block via relationship/category, so their names never appear in the page's own
// text. Resolve them so a search for a member surfaces the page that lists them.
// (Team blocks are top-level layout blocks, so no recursion is needed.)
type TeamRef = number | { id?: number }
const refId = (v: TeamRef): number | undefined => (typeof v === 'object' ? v?.id : v)

const collectTeamNames = async (layout: unknown, req: PayloadRequest): Promise<string[]> => {
  if (!Array.isArray(layout)) return []
  const names: string[] = []
  for (const block of layout) {
    const b = block as {
      blockType?: string
      populateBy?: string
      categories?: TeamRef[]
      limit?: number
      selectedMembers?: TeamRef[]
    }
    if (b?.blockType !== 'team') continue

    let where: Where
    let limit = 1000
    if (b.populateBy === 'selection') {
      const ids = (b.selectedMembers ?? []).map(refId).filter((n): n is number => !!n)
      if (!ids.length) continue
      where = { id: { in: ids } }
    } else {
      const catIds = (b.categories ?? []).map(refId).filter((n): n is number => !!n)
      // Skip inactive members — the block hides them, so they shouldn't match.
      where = catIds.length
        ? { and: [{ inactive: { not_equals: true } }, { categories: { in: catIds } }] }
        : { inactive: { not_equals: true } }
      if (b.limit && b.limit > 0) limit = b.limit
    }

    const res = await req.payload.find({
      collection: 'team',
      where,
      depth: 0,
      limit,
      req,
      select: { name: true, jobTitle: true },
    })
    for (const m of res.docs as { name?: string; jobTitle?: string }[]) {
      const line = [m.name, m.jobTitle].filter(Boolean).join(' ')
      if (line) names.push(line)
    }
  }
  return names
}

export const beforeSyncWithSearch: BeforeSync = async ({ req, originalDoc, searchDoc }) => {
  const {
    doc: { relationTo: collection },
  } = searchDoc

  const { slug, id, categories, title, meta } = originalDoc

  // Body text for full-content search. Posts carry a single `content` richText;
  // Pages spread prose across `layout` blocks (+ the hero).
  const parts: string[] = []
  if (collection === 'posts') {
    collectText(originalDoc.content, 'content', parts)
  } else {
    collectText(originalDoc.layout, 'layout', parts)
    collectText(originalDoc.hero, 'hero', parts)
    parts.push(...(await collectTeamNames(originalDoc.layout, req)))
  }
  const content = parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, CONTENT_CAP)

  const modifiedDoc: DocToSync = {
    ...searchDoc,
    slug,
    content,
    meta: {
      ...meta,
      title: meta?.title || title,
      image: meta?.image?.id || meta?.image,
      description: meta?.description,
    },
    categories: [],
  }

  if (categories && Array.isArray(categories) && categories.length > 0) {
    const populatedCategories: { id: string | number; title: string }[] = []
    for (const category of categories) {
      if (!category) {
        continue
      }

      if (typeof category === 'object') {
        populatedCategories.push(category)
        continue
      }

      const doc = await req.payload.findByID({
        collection: 'categories',
        id: category,
        disableErrors: true,
        depth: 0,
        select: { title: true },
        req,
      })

      if (doc !== null) {
        populatedCategories.push(doc)
      } else {
        console.error(
          `Failed. Category not found when syncing collection '${collection}' with id: '${id}' to search.`,
        )
      }
    }

    modifiedDoc.categories = populatedCategories.map((each) => ({
      relationTo: 'categories',
      categoryID: String(each.id),
      title: each.title,
    }))
  }

  return modifiedDoc
}
