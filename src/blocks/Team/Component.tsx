import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { Team, TeamCategory, TeamBlock as TeamBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { getMediaUrl } from '@/utilities/getMediaUrl'

import { TeamClient, type TeamMember } from './TeamClient'

/** Resolve a category relationship value to a {value,label} descriptor. */
const toTab = (c: number | TeamCategory): { value: string; label: string } | null => {
  if (typeof c !== 'object') return null
  return { value: c.slug || String(c.id), label: c.title }
}

const toMember = (doc: Team, allowed: Set<number> | null, primaryGroupOnly = false): TeamMember => {
  const photo = doc.photo
  const hasPhoto = photo && typeof photo === 'object' && photo.url
  const bio = doc.bio
  const hasBio = bio && typeof bio === 'object' && 'root' in bio
  const categories = (doc.categories || [])
    // When the block filters to specific groups, only surface those groups on
    // the member — otherwise a cross-listed person spawns stray off-topic
    // sections (e.g. a board member who also sits on a state committee). A
    // hand-picked selection has no such filter, so cap to the member's own
    // first-listed category instead — otherwise the same duplication happens
    // per member rather than across the whole block.
    .filter((c) => !allowed || allowed.has(typeof c === 'object' ? c.id : c))
    .map(toTab)
    .filter((c): c is { value: string; label: string } => Boolean(c))
    .slice(0, primaryGroupOnly ? 1 : undefined)

  return {
    id: String(doc.id),
    name: doc.name,
    categories,
    ...(doc.jobTitle ? { jobTitle: doc.jobTitle } : {}),
    ...(doc.jobTitleSecondary ? { jobTitleSecondary: doc.jobTitleSecondary } : {}),
    ...(doc.email ? { email: doc.email } : {}),
    ...(doc.linkedin ? { linkedin: doc.linkedin } : {}),
    ...(hasPhoto
      ? { photoSrc: getMediaUrl(photo.url!, photo.updatedAt), photoAlt: photo.alt || doc.name }
      : {}),
    ...(hasBio
      ? {
          bio: (
            <RichText
              // Bios run long; tighten type + paragraph spacing so the modal
              // fits without a scrollbar where possible.
              className="prose-p:my-3 prose-p:text-[0.95rem] prose-p:leading-relaxed prose-li:my-1"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={bio as any}
              enableGutter={false}
              enableProse
            />
          ),
        }
      : {}),
  }
}

/**
 * Team — an editorial directory sourced from the Team collection. The block
 * resolves Team docs to plain descriptors here (server side) and hands them to a
 * client component that owns the layout (grouped / tabs) and the bio modal.
 */
export const TeamBlock: React.FC<TeamBlockProps & { id?: string }> = async (props) => {
  const { categories, density, header, layout, limit, populateBy, selectedMembers } = props

  let docs: Team[] = []
  let allowed: Set<number> | null = null
  // Group display order, taken from the editor's category selection. Built from
  // the resolved category objects so it lines up with each member's group value.
  let groupOrder: string[] | undefined

  if (populateBy === 'selection') {
    docs = (selectedMembers || [])
      .map((m) => (typeof m === 'object' ? m : null))
      .filter((m): m is Team => m !== null && !m.inactive)
  } else {
    const categoryIds = (categories || []).map((c) => (typeof c === 'object' ? c.id : c))
    if (categoryIds.length > 0) {
      allowed = new Set(categoryIds)
      // Display order from the resolved category objects (populated at depth ≥ 1).
      const resolved = (categories || []).filter(
        (c): c is TeamCategory => typeof c === 'object' && c !== null,
      )
      if (resolved.length === categoryIds.length) {
        groupOrder = resolved.map((c) => c.slug || String(c.id))
      }
    }
    const payload = await getPayload({ config: configPromise })
    // Hide inactive members. Null-safe: a freshly-added column leaves existing
    // rows NULL, and `not_equals: true` would drop them, so match false OR null.
    const activeFilter = {
      or: [{ inactive: { equals: false } }, { inactive: { exists: false } }],
    }
    const where =
      categoryIds.length > 0
        ? { and: [{ categories: { in: categoryIds } }, activeFilter] }
        : activeFilter
    const result = await payload.find({
      collection: 'team',
      depth: 1,
      limit: limit && limit > 0 ? limit : 0,
      sort: 'order',
      where,
    })
    docs = result.docs
  }

  const members = docs.map((d) => toMember(d, allowed, populateBy === 'selection'))
  if (members.length === 0) return null

  const showHeader = header?.enableHeader
  const anchorId = header?.anchorId || undefined

  return (
    <section className="container py-20 md:py-28" id={anchorId}>
      <div className="mx-auto max-w-5xl">
        {showHeader && (header?.eyebrow || header?.heading || header?.body) && (
          <div className="mb-12 max-w-2xl">
            {header?.eyebrow && <p className="mb-2 type-eyebrow text-primary">{header.eyebrow}</p>}
            {header?.heading && <h2 className="type-h2">{header.heading}</h2>}
            {header?.body && <RichText className="mt-4" data={header.body} enableGutter={false} />}
          </div>
        )}

        <TeamClient
          density={density ?? 'medium'}
          groupOrder={groupOrder}
          layout={layout ?? 'grouped'}
          members={members}
        />
      </div>
    </section>
  )
}
