import PageTemplate, { generateMetadata } from './[...slug]/page'

export default PageTemplate

export { generateMetadata }

// Match the catch-all route: render home on demand so it serves the seeded page
// from the DB (not the build-time homeStatic fallback) and can read draftMode().
export const dynamic = 'force-dynamic'
