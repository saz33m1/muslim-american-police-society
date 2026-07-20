import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

// Simplify the header IA to two sections — About Us and Programs (Press and Contact
// fold into About Us; MAPS Events leads Programs). This is a DATA change only — no schema drift,
// the navGroups/flatLinks fields already exist. `seedHeaderNav` can't do it: it only
// fills an EMPTY global, so already-seeded envs (prod/staging) keep the old IA. This
// force-overwrites the global to the target set. `disableRevalidate` skips the
// afterChange revalidateTag (no request context in a migration); the deploy serves
// fresh content on the next request anyway (header read is per-request).
//
// The target IA is inlined (not imported from seedNav) so this run-once migration is
// a frozen snapshot: a later IA change edits seedNav + ships its own migration and
// must not retroactively alter what this one applied.
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.updateGlobal({
    slug: 'header',
    data: {
      navGroups: [
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
            { label: 'Contact', href: '/contact' },
          ],
        },
        {
          label: 'Programs',
          href: '/programs',
          items: [
            { label: 'MAPS Events', href: '/events/maps' },
            { label: 'Career Support', href: '/programs/career-support' },
            { label: 'Community Building', href: '/programs/community-building' },
            { label: 'Legal Advocacy', href: '/programs/legal-advocacy' },
            { label: 'Policy Initiatives', href: '/programs/policy-initiatives' },
            { label: 'Private Sector Engagement', href: '/programs/private-sector-engagement' },
          ],
        },
      ],
      flatLinks: [],
    },
    req,
    context: { disableRevalidate: true },
  })
  payload.logger.info('simplify_nav migration: header IA set to About Us / Programs')
}

// Restore the prior IA (5 sections + 3 bottom-row links) so the migration is
// reversible. Inlined on purpose — a down() must not depend on the current
// seedNav defaults, which have moved on.
export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.updateGlobal({
    slug: 'header',
    data: {
      navGroups: [
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
          ],
        },
        {
          label: 'Events',
          items: [
            { label: 'Upcoming Events', href: '/events/upcoming' },
            { label: 'MAPS Events', href: '/events/maps' },
            { label: 'Partner Events', href: '/events/partner' },
            { label: 'All Events', href: '/events' },
          ],
        },
        {
          label: 'Programs',
          href: '/programs',
          items: [
            { label: 'Career Support', href: '/programs/career-support' },
            { label: 'Community Building', href: '/programs/community-building' },
            { label: 'Legal Advocacy', href: '/programs/legal-advocacy' },
            { label: 'Policy Initiatives', href: '/programs/policy-initiatives' },
            { label: 'Private Sector Engagement', href: '/programs/private-sector-engagement' },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'Federal Employment', href: '/resources/federal-employment' },
            { label: 'Jumuah Services', href: '/resources/jumuah-services' },
            {
              label: 'Fellowships (Young Professionals)',
              href: '/resources/public-service-fellowships-young-professionals',
            },
            {
              label: 'Fellowships (Mid-Career to Senior)',
              href: '/resources/public-service-fellowships-mid-career-to-senior-professionals',
            },
          ],
        },
        {
          label: 'Members',
          gated: true,
          items: [{ label: 'Member Portal', href: '/members/portal' }],
        },
      ],
      flatLinks: [
        { label: 'Press', href: '/press' },
        { label: 'Latest Updates', href: '/latest-updates' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    req,
    context: { disableRevalidate: true },
  })
}
