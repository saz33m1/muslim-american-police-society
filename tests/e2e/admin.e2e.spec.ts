import { test, expect, Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()

    // Drop the junk this suite leaves in the shared dev DB: the CRUD test's
    // `E2E CRUD*` pages, plus the empty autosave-orphan draft the "edit view"
    // test creates by visiting /create (drafts autosave after 100ms).
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'pages',
      where: {
        or: [
          { title: { like: 'E2E CRUD' } },
          { title: { exists: false } },
          { title: { equals: '' } },
        ],
      },
    })
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/pages/create')
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })

  // Full CRUD in one flow: build a Page from a block, publish it, and confirm the
  // public route renders it. `layout` is required, so publishing at all proves the
  // page carries a block. Kept as a single test so a retry re-runs the whole flow
  // (the created slug isn't shared across tests). (#129)
  test('can create a page with a block, publish it, and render it on the front-end', async () => {
    await page.goto('http://localhost:3000/admin/collections/pages/create')
    await expect(page.locator('#field-title')).toBeVisible()

    // Title drives the auto-generated slug.
    await page.fill('#field-title', `E2E CRUD ${Date.now()}`)

    // The layout blocks field lives under the "Content" tab. Add one block (Call
    // to Action has no required fields) from the blocks drawer, then publish
    // (drafts are enabled, so the action reads "Publish changes").
    await page.locator('.tabs-field__tab-button', { hasText: 'Content' }).click()
    await page.getByRole('button', { name: 'Add Layout' }).click()
    await page.locator('.blocks-drawer__block', { hasText: 'Call to Action' }).click()
    await page.getByRole('button', { name: 'Publish changes' }).click()

    // Slug auto-generates from the title once saved.
    await expect(page.locator('#field-slug')).not.toHaveValue('')
    const slug = await page.locator('#field-slug').inputValue()

    // Poll the public route until the just-published page resolves (the anon
    // front-end only serves published docs, so a 404 here means it never
    // published). Polling absorbs publish/revalidation lag.
    await expect(async () => {
      const res = await page.request.get(`http://localhost:3000/${slug}`)
      expect(res.status()).toBeLessThan(400)
    }).toPass({ timeout: 20000 })

    await page.goto(`http://localhost:3000/${slug}`)
    await expect(page.locator('article')).toBeVisible()
  })
})
