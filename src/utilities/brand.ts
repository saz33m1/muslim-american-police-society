// Single source of truth for the site's brand strings. Used by the SEO plugin,
// generateMeta, the OpenGraph defaults, the footer, and payload.config.ts, so
// forking to a new org means editing this file, not hunting string literals.
// Stays plain data — no React/client imports — because the SEO plugin pulls it
// into the Payload config graph (see CLAUDE.md "Layout builder" two-registry note).
export const SITE_NAME = 'Muslim American Police Society'

export const SITE_DESCRIPTION =
  'The Muslim American Police Society supports Muslim law enforcement officers through professional development, community partnership, and advocacy.'

export const FOOTER_TAGLINE =
  'Join MAPS to connect with Muslim officers nationwide: mentorship, professional development, and a voice inside law enforcement.'

export const COPYRIGHT_NAME = 'Muslim American Police Society'

// Icon components stay local to Footer/Component.tsx (keyed by `platform`) so
// this file never imports lucide-react. Supported keys: Facebook, Instagram, X,
// LinkedIn, YouTube — anything else needs a lucide import added to that map.
// ponytail: empty until the org's real accounts exist. The previous entries
// pointed at a different organization, so they were removed rather than left
// to ship as wrong links. Footer renders an empty "Follow us" list meanwhile.
export const SOCIAL: { platform: string; href: string }[] = []

// Every href must resolve to a seeded page or an app route, or the footer ships
// dead links. Add entries here as the corresponding pages get built.
export const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'About', href: '/about-us' },
      { label: 'Programs', href: '/programs' },
      { label: 'Updates', href: '/latest-updates' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export const MEMBERSHIP_CTA = { label: 'Become a member', href: '/join' }

// Header's prominent CTA (desktop + mobile nav). A fork with no donation flow
// removes the button from DesktopNav/NavMenu rather than blanking this.
export const DONATE_CTA = { label: 'Donate', href: '/donate' }

export const EMAIL_FROM_NAME = 'Muslim American Police Society'
export const EMAIL_FROM_ADDRESS = 'no-reply@muslimamericanpolicesociety.org'

// Files live at public/logo-{primary,secondary}-{light,dark}.svg. dims are the
// intrinsic aspect ratio scaled to a 34px tall mark (src/components/Logo/Logo.tsx
// builds the <img> src from the variant/theme, not from this object).
// ponytail: dims still match the inherited placeholder SVGs. Update both when
// the real logo files land or the mark renders distorted.
export const LOGO = {
  alt: 'Muslim American Police Society',
  dims: {
    primary: { width: 156, height: 34 },
    secondary: { width: 122, height: 34 },
  },
}

// File lives at public/og.webp. Single source for the three meta surfaces
// (layout.tsx, generateMeta.ts, mergeOpenGraph.ts) that used to each hardcode it.
export const OG_IMAGE = '/og.webp'
