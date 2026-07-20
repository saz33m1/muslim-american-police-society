import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from .env (DATABASE_URL etc.) for global-setup.
 */
import 'dotenv/config'

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * The suite runs against a dev server on :3000. Locally it reuses an
 * already-running server (`reuseExistingServer`); otherwise it starts one.
 * Content is a precondition — seed the dev DB with `npm run seed:pages` (CI seeds
 * before the e2e step). `global-setup` ensures the admin test user exists.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Single worker: the suite runs against a `next dev` server that compiles routes
     on demand — parallel workers triggering concurrent cold compiles makes it
     flaky (aborted navigations, partial RSC payloads). Serial keeps it stable. */
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  /* 'list' for terminal output; the HTML report is written but never auto-served
     (auto-open hangs headless / agent runs). */
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    // Repo is npm-installed (see CLAUDE.md) — the dev script is `npm run dev`.
    // CI runs on Linux where `predev` (a Windows-only PowerShell Docker check)
    // can't run, so use `dev:ci` there: same `next dev`, no predev hook.
    command: process.env.CI ? 'npm run dev:ci' : 'npm run dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000',
    timeout: 180_000,
  },
})
