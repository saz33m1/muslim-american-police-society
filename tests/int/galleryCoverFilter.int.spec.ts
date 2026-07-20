import { describe, expect, it } from 'vitest'

import { Posts } from '@/collections/Posts'
import type { Field } from 'payload'

// The `galleryCover` picker must only ever offer photos from THIS post's own gallery
// — "a custom cover from one of the children". That rule lives in the field's
// filterOptions, which is a pure function of the form data, so it is testable without
// a DB. Without this, the admin picker would happily let an editor choose any Media
// doc in the library as a gallery's cover.

// filterOptions returns a Where clause (or `false` to offer nothing at all).
type FilterOptions = (args: { data: unknown }) => unknown

const findField = (fields: Field[], name: string): Field | undefined => {
  for (const f of fields) {
    if ('name' in f && f.name === name) return f
    // The field is nested inside a tab/row, so recurse rather than hardcoding a path
    // that a later field reshuffle would silently break.
    const nested = f as { fields?: Field[]; tabs?: { fields: Field[] }[] }
    if (nested.fields) {
      const hit = findField(nested.fields, name)
      if (hit) return hit
    }
    for (const tab of nested.tabs ?? []) {
      const hit = findField(tab.fields, name)
      if (hit) return hit
    }
  }
  return undefined
}

const galleryCover = findField(Posts.fields, 'galleryCover')
const filterOptions = (galleryCover as { filterOptions?: FilterOptions } | undefined)?.filterOptions

const run = (data: unknown) => filterOptions!({ data })

describe('galleryCover filterOptions', () => {
  it('is wired onto the galleryCover field', () => {
    expect(galleryCover).toBeDefined()
    expect(typeof filterOptions).toBe('function')
  })

  it('restricts the picker to the ids in this post’s gallery', () => {
    expect(run({ gallery: [11, 22, 33] })).toEqual({ id: { in: [11, 22, 33] } })
  })

  it('reads ids out of populated gallery photos', () => {
    // Depth-loaded forms hand back objects, not bare ids.
    expect(run({ gallery: [{ id: 11 }, { id: 22 }] })).toEqual({ id: { in: [11, 22] } })
  })

  it('offers nothing when the post has no gallery', () => {
    // `false` means "no options", which is what keeps an arbitrary Media doc from
    // being selectable. Returning an empty/absent clause would offer the whole library.
    expect(run({ gallery: [] })).toBe(false)
    expect(run({})).toBe(false)
    expect(run(undefined)).toBe(false)
  })

  it('drops unusable gallery entries rather than offering the whole library', () => {
    expect(run({ gallery: [null, undefined, 42] })).toEqual({ id: { in: [42] } })
    expect(run({ gallery: [null] })).toBe(false)
  })
})
