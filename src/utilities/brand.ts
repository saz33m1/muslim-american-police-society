// Single source of truth for the site's brand strings. Used by the SEO plugin,
// generateMeta, the OpenGraph defaults, the footer, and payload.config.ts, so
// forking to a new org means editing this file, not hunting string literals.
// Stays plain data — no React/client imports — because the SEO plugin pulls it
// into the Payload config graph (see CLAUDE.md "Layout builder" two-registry note).
export const SITE_NAME = 'MAPS National'

export const SITE_DESCRIPTION =
  'MAPS National connects and develops public servants through leadership, advocacy, and professional development.'

export const FOOTER_TAGLINE =
  'Join MAPS to unlock member-exclusive benefits: career support, community, and a voice for Muslim Americans in public service.'

export const COPYRIGHT_NAME = 'MAPS'

// Icon components stay local to Footer/Component.tsx (keyed by `platform`) so
// this file never imports lucide-react.
export const SOCIAL: { platform: string; href: string }[] = [
  { platform: 'Facebook', href: 'https://www.facebook.com/MAPSNational' },
  { platform: 'Instagram', href: 'https://www.instagram.com/mapsnational/' },
  { platform: 'X', href: 'https://twitter.com/MAPSNational' },
  {
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/company/muslim-americans-in-public-service/',
  },
  { platform: 'YouTube', href: 'https://www.youtube.com/channel/UCb5T3l6hpKdWCFBltCmX-5g' },
]

export const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'About', href: '/about-us' },
      { label: 'Events', href: '/events' },
      { label: 'Updates', href: '/latest-updates' },
      { label: 'Programs', href: '/programs' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export const MEMBERSHIP_CTA = { label: 'Become a member', href: '/join' }

// Header's prominent CTA (desktop + mobile nav). A fork with no donation flow
// removes the button from DesktopNav/NavMenu rather than blanking this.
export const DONATE_CTA = { label: 'Donate', href: '/donate' }

export const EMAIL_FROM_NAME = 'MAPS National'
export const EMAIL_FROM_ADDRESS = 'no-reply@mapsnational.org'

// Files live at public/logo-{primary,secondary}-{light,dark}.svg. dims are the
// intrinsic aspect ratio scaled to a 34px tall mark (src/components/Logo/Logo.tsx
// builds the <img> src from the variant/theme, not from this object).
export const LOGO = {
  alt: 'MAPS National',
  dims: {
    primary: { width: 156, height: 34 },
    secondary: { width: 122, height: 34 },
  },
}

// File lives at public/og.webp. Single source for the three meta surfaces
// (layout.tsx, generateMeta.ts, mergeOpenGraph.ts) that used to each hardcode it.
export const OG_IMAGE = '/og.webp'
