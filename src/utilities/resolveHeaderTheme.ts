import type { Theme } from '@/providers/Theme/types'

/**
 * Server-side resolution of the per-page header theme, so the overlay header
 * renders in the right theme on first paint instead of flipping in a post-mount
 * client effect (which caused a flash of dark-on-navy header text — #134).
 *
 * Mirrors the client setters and must stay in sync with them:
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

  // Page heros all sit on a light/inherited surface now, so no page-route
  // override is needed.
  return null
}
