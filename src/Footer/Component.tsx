import Link from 'next/link'
import React from 'react'
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { Logo } from '@/components/Logo/Logo'
import {
  COPYRIGHT_NAME,
  FOOTER_COLUMNS,
  FOOTER_TAGLINE,
  MEMBERSHIP_CTA,
  SOCIAL,
} from '@/utilities/brand'
import { PortalLogin } from './PortalLogin'

// Site footer — ported from the live MAPS site (migration/_extracted/index.html).
// The structure is a fixed, hand-picked brand IA, so the footer does not read the
// `footer` CMS global. (The header nav, by contrast, is now managed in the `header`
// global — see src/Header/config.ts.) Content (columns/social/CTA/copyright) lives
// in src/utilities/brand.ts; this file owns markup + the icon lookup only.

// lucide covers four of the five; X (formerly Twitter) keeps the twitter.com href
// per the live site but uses the current X glyph.
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const SOCIAL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Facebook,
  Instagram,
  X: XIcon,
  LinkedIn: Linkedin,
  YouTube: Youtube,
}

export function Footer() {
  return (
    <footer
      className="mt-auto border-t border-border bg-[var(--brand-primary-darker)] text-[var(--neutral-lightest)]"
      data-theme="dark"
    >
      <div className="container py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Brand + newsletter */}
          <div className="max-w-md">
            <Link className="inline-flex items-center" href="/">
              <Logo variant="secondary" theme="dark" />
            </Link>
            <p className="mt-6 text-sm text-[var(--neutral-light)]">{FOOTER_TAGLINE}</p>

            <Link
              className="mt-4 inline-flex shrink-0 rounded-md bg-[var(--neutral-lightest)] px-5 py-2 text-sm font-semibold text-[var(--brand-primary-base)] transition-colors hover:bg-white"
              href={MEMBERSHIP_CTA.href}
            >
              {MEMBERSHIP_CTA.label}
            </Link>

            {/* Separate from the wayfinding column: the member-portal login. */}
            <PortalLogin />
          </div>

          {/* Link columns + social */}
          <div className="grid grid-cols-2 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <nav aria-label={col.title} key={col.title}>
                <p className="mb-4 text-sm font-semibold">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        className="text-sm text-[var(--neutral-light)] transition-colors hover:text-[var(--neutral-lightest)]"
                        href={l.href}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <p className="mb-4 text-sm font-semibold">Follow us</p>
              <ul className="flex flex-wrap gap-3">
                {SOCIAL.map(({ platform, href }) => {
                  const Icon = SOCIAL_ICONS[platform]
                  return (
                    <li key={platform}>
                      <a
                        aria-label={platform}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--neutral-dark)] text-[var(--neutral-lightest)] transition-colors hover:bg-[var(--neutral-dark)]"
                        href={href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {Icon && <Icon className="size-4" />}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider + bottom credit row */}
        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--neutral-dark)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--neutral-light)]">
            © {new Date().getFullYear()} {COPYRIGHT_NAME}. All rights reserved.
          </p>
          <ThemeSelector />
        </div>
      </div>
    </footer>
  )
}
