import { seedTestUser } from '../helpers/seedUser'

/**
 * Runs once before the e2e suite. Ensures the admin test user exists (idempotent).
 *
 * Page/post content is a precondition, not seeded here: run `npm run seed:pages`
 * against the dev DB locally; CI seeds before invoking the e2e step.
 */
async function globalSetup(): Promise<void> {
  await seedTestUser()
}

export default globalSetup
