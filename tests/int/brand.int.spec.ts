import { describe, expect, it } from 'vitest'

import {
  COPYRIGHT_NAME,
  DONATE_CTA,
  EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME,
  FOOTER_COLUMNS,
  FOOTER_TAGLINE,
  LOGO,
  MEMBERSHIP_CTA,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SOCIAL,
} from '@/utilities/brand'

// Pure-data test: brand.ts must stay plain data (no React/client deps — it sits
// in the Payload config graph via the SEO plugin), so this pins the shape every
// consumer (Footer, BeforeDashboard, payload.config.ts) relies on.
describe('brand.ts', () => {
  it('exports site identity strings', () => {
    expect(typeof SITE_NAME).toBe('string')
    expect(typeof SITE_DESCRIPTION).toBe('string')
    expect(typeof FOOTER_TAGLINE).toBe('string')
    expect(typeof COPYRIGHT_NAME).toBe('string')
  })

  it('exports SOCIAL as platform+href pairs, no components', () => {
    expect(SOCIAL.length).toBeGreaterThan(0)
    for (const entry of SOCIAL) {
      expect(typeof entry.platform).toBe('string')
      expect(entry.href).toMatch(/^https:\/\//)
      expect(entry).not.toHaveProperty('Icon')
    }
  })

  it('exports FOOTER_COLUMNS as title+links groups', () => {
    expect(FOOTER_COLUMNS.length).toBeGreaterThan(0)
    for (const col of FOOTER_COLUMNS) {
      expect(typeof col.title).toBe('string')
      expect(col.links.length).toBeGreaterThan(0)
      for (const link of col.links) {
        expect(typeof link.label).toBe('string')
        expect(link.href.startsWith('/')).toBe(true)
      }
    }
  })

  it('exports the chrome CTAs (footer membership, header donate)', () => {
    for (const cta of [MEMBERSHIP_CTA, DONATE_CTA]) {
      expect(typeof cta.label).toBe('string')
      expect(cta.href.startsWith('/')).toBe(true)
    }
  })

  it('exports email-from defaults', () => {
    expect(typeof EMAIL_FROM_NAME).toBe('string')
    expect(EMAIL_FROM_ADDRESS).toMatch(/^\S+@\S+\.\S+$/)
  })

  it('exports LOGO alt + per-variant intrinsic dims', () => {
    expect(typeof LOGO.alt).toBe('string')
    for (const variant of ['primary', 'secondary'] as const) {
      expect(LOGO.dims[variant].width).toBeGreaterThan(0)
      expect(LOGO.dims[variant].height).toBeGreaterThan(0)
    }
  })

  it('exports a single OG image path used by all three meta surfaces', () => {
    expect(OG_IMAGE.startsWith('/')).toBe(true)
  })
})
