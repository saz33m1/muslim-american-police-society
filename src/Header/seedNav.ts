import type { Payload, PayloadRequest } from 'payload'

import type { Header } from '@/payload-types'

// Default site nav IA (G1) — the structure that used to be hardcoded in NavMenu.
// Now it seeds the `header` global once so it can be managed in admin. Slugs match
// the seeded pages / app routes. Edit these in admin after seeding; this only
// fills an EMPTY global, so it never clobbers later edits.
export const defaultNavGroups: NonNullable<Header['navGroups']> = [
  {
    label: 'About Us',
    href: '/about-us',
    items: [
      { label: 'Mission', href: '/about-us/mission' },
      { label: 'Board & Leadership', href: '/about-us/board-leadership' },
      { label: 'Advisory Council', href: '/about-us/advisory-council' },
      { label: 'State Committees', href: '/about-us/state-committees' },
      { label: 'Partners', href: '/about-us/partners' },
      { label: 'FAQ', href: '/about-us/faq' },
      { label: 'Press', href: '/press' },
      // Contact folded into About Us (no longer a standalone bottom-row link).
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Programs',
    href: '/programs',
    items: [
      // MAPS Events folded in at the top (the old Events section is retired).
      { label: 'MAPS Events', href: '/events/maps' },
      { label: 'Career Support', href: '/programs/career-support' },
      { label: 'Community Building', href: '/programs/community-building' },
      { label: 'Legal Advocacy', href: '/programs/legal-advocacy' },
      { label: 'Policy Initiatives', href: '/programs/policy-initiatives' },
      { label: 'Private Sector Engagement', href: '/programs/private-sector-engagement' },
    ],
  },
]

// Press now lives inside the About Us section (before Contact), so the bottom-row
// flat links are empty. Kept as an (empty) array so admins can still add links.
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
