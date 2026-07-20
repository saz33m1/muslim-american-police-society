import { academyVideosImport, videoCategoriesImport } from './mappings/academy'
import { latestUpdatesImport, updateCategoriesImport } from './mappings/posts'
import { teamCategoriesImport, teamMembersImport } from './mappings/team'
import { testimonialsCareerImport, testimonialsProgramsImport } from './mappings/testimonials'
import type { CollectionImport } from './types'

/**
 * Every importable collection, keyed by the name passed to the CLI
 * (`npm run import -- <name>`). This is the ONLY file edited to add a new
 * collection to the importer: write its mapping under `mappings/` and register
 * it here. The runner resolves `dependsOn` automatically, so importing `team`
 * also imports `team-categories` first.
 */
export const importsByName: Record<string, CollectionImport> = {
  'team-categories': teamCategoriesImport,
  team: teamMembersImport,
  'update-categories': updateCategoriesImport,
  updates: latestUpdatesImport,
  'testimonials-career': testimonialsCareerImport,
  'testimonials-programs': testimonialsProgramsImport,
  'video-categories': videoCategoriesImport,
  'academy-videos': academyVideosImport,
}
