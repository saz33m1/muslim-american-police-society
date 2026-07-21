import type { Payload, PayloadRequest } from 'payload'

import type { Header } from '@/payload-types'

// Default site nav IA (G1) — the structure that used to be hardcoded in NavMenu.
// Now it seeds the `header` global once so it can be managed in admin. Slugs match
// the seeded pages / app routes. Edit these in admin after seeding; this only
// fills an EMPTY global, so it never clobbers later edits.
// Every href here must resolve to a page that scripts/seed-pages.ts creates (or
// an app route), or the nav ships dead links on a fresh database. Grow this
// alongside the seed slices as real pages are added.
export const defaultNavGroups: NonNullable<Header['navGroups']> = [
  {
    label: 'About Us',
    href: '/about-us',
    items: [
      { label: 'Mission', href: '/about-us/mission' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Programs',
    href: '/programs',
    items: [],
  },
]

// Bottom-row flat links. Kept as an (empty) array so admins can still add links.
export const defaultFlatLinks: NonNullable<Header['flatLinks']> = []

/**
 * Idempotent: seeds the default nav only when the header global has no groups yet,
 * so re-running (local script or a redeploy) never overwrites admin edits.
 * `disableRevalidate` skips the afterChange revalidateTag (no request context here).
 */
export async function seedHeaderNav(
  payload: Payload,
  req?: PayloadRequest,
): Promise<'seeded' | 'skipped'> {
  // `req` threads the caller's transaction so this can run inside a migration and
  // see tables created earlier in the same up(). Standalone (seed:header) omits it.
  const existing = await payload.findGlobal({ slug: 'header', depth: 0, req })
  if (existing?.navGroups?.length) return 'skipped'

  await payload.updateGlobal({
    slug: 'header',
    data: { navGroups: defaultNavGroups, flatLinks: defaultFlatLinks },
    req,
    context: { disableRevalidate: true },
  })
  return 'seeded'
}
