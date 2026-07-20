// Public URL prefix per linkable collection. The Posts collection is served at
// /latest-updates/<slug> to match the legacy Webflow URLs (the Payload collection
// slug stays "posts"); pages live at the site root. Single source of truth for
// every place that turns a (collection, slug) pair into a link or revalidation
// path — change the prefix here, not in each caller.
export const collectionPrefix: Record<'pages' | 'posts', string> = {
  pages: '',
  posts: '/latest-updates',
}

export const collectionHref = (relationTo: 'pages' | 'posts', slug: string): string =>
  // The home page is stored with slug 'home' but served at the site root, not
  // '/home' (which would be a duplicate). Same mapping as revalidatePage.ts.
  relationTo === 'pages' && slug === 'home' ? '/' : `${collectionPrefix[relationTo]}/${slug}`
