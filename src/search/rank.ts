// Relevance ranking for /search. The search plugin stores flat, ILIKE-able text
// with no relevance score, so we rank the matched set in JS: a title/name match
// outranks a body-only match, and for a person-name query the page that lists
// that member is lifted above posts that merely mention them. Priority
// (news-first: posts 20 > pages 10) breaks ties.
//
// ponytail: fine at this content volume (hundreds of docs, fetched whole and
// sorted in memory). Move to Postgres full-text (ts_rank) if the corpus grows
// into the thousands.

export type RankableDoc = {
  title?: string | null
  slug?: string | null
  content?: string | null
  priority?: number | null
  meta?: { title?: string | null; description?: string | null } | null
  doc?: { relationTo?: 'pages' | 'posts' } | null
}

const has = (value: string | null | undefined, q: string): boolean =>
  !!value && value.toLowerCase().includes(q)

// Higher = more relevant. A title/name hit (4) beats a slug hit (2) beats a
// body/description-only hit (1); a person query lifts the matching page (+3),
// so a roster page outranks posts that only name-drop the member.
export const scoreDoc = (d: RankableDoc, q: string, isPersonQuery: boolean): number => {
  let score = 1
  if (has(d.title, q) || has(d.meta?.title, q)) score = 4
  else if (has(d.slug, q)) score = 2
  if (isPersonQuery && d.doc?.relationTo === 'pages') score += 3
  return score
}

export const rankSearchResults = <T extends RankableDoc>(
  docs: T[],
  query: string,
  isPersonQuery: boolean,
): T[] => {
  const q = query.trim().toLowerCase()
  if (!q) return docs
  return [...docs].sort(
    (a, b) =>
      scoreDoc(b, q, isPersonQuery) - scoreDoc(a, q, isPersonQuery) ||
      (b.priority ?? 0) - (a.priority ?? 0),
  )
}
