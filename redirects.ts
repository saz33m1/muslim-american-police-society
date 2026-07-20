import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Posts moved from /posts to /latest-updates (legacy Webflow paths). Permanently
  // redirect the old archive index, its pagination, and any old detail URL so
  // stale links/bookmarks land on the new location. Ordered: pagination collapses
  // to the feed before the generic detail rule can rewrite /posts/page/N.
  const legacyPostsIndex = { source: '/posts', destination: '/latest-updates', permanent: true }
  const legacyPostsPages = {
    source: '/posts/page/:n*',
    destination: '/latest-updates',
    permanent: true,
  }
  const legacyPostDetail = {
    source: '/posts/:slug+',
    destination: '/latest-updates/:slug+',
    permanent: true,
  }

  return [internetExplorerRedirect, legacyPostsIndex, legacyPostsPages, legacyPostDetail]
}
