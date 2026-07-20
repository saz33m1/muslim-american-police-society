import type { Theme } from '@/providers/Theme/types'

import { queryPageBySlug } from './queryPageBySlug'

/**
 * Server-side resolution of the per-page header theme, so the overlay header
 * renders in the right theme on first paint instead of flipping in a post-mount
 * client effect (which caused a flash of dark-on-navy header text — #134).
 *
 * Mirrors the client setters and must stay in sync with them:
 *  - High Impact hero (full-bleed navy) → dark        (heros/HighImpact)
 *  - Post detail (navy masthead)        → dark        (latest-updates/[slug])
 *  - Search (image backdrop)            → light       (search/page.client)
 *  - everything else                    → null (inherit the global theme)
 *
 * Returning null means "no override" — the header inherits the global `data-theme`
 * on `<html>`, so global theme switching and untouched pages are unaffected.
 */
export async function resolveHeaderTheme(pathname: string | null): Promise<Theme | null> {
  if (!pathname) return null

  if (pathname === '/search') return 'light'

  // Post detail is a full-bleed navy masthead. Bare `/latest-updates` is the
  // archive (a normal Page), so require a slug segment after it.
  if (/^\/latest-updates\/.+/.test(pathname)) return 'dark'

  // Page routes: only a High Impact hero needs the dark header.
  const slug = pathname === '/' ? 'home' : decodeURIComponent(pathname.replace(/^\/+/, ''))
  if (!slug) return null

  try {
    const page = await queryPageBySlug({ slug })
    return page?.hero?.type === 'highImpact' ? 'dark' : null
  } catch {
    // Never let header-theme resolution break a page render.
    return null
  }
}
