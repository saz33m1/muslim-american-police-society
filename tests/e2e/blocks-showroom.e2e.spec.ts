import { test, expect } from '@playwright/test'

import { appErrors, trackConsoleErrors } from '../helpers/e2e'

// The showroom renders every registered block + hero with sample data in BOTH
// themes on a single route, so visiting each detail page is a render smoke for
// the whole catalog across themes. (#123)
test('blocks gallery index lists the catalog', async ({ page }) => {
  await page.goto('/design-system/blocks')
  await expect(page.getByRole('heading', { name: 'Blocks Gallery', level: 1 })).toBeVisible()
  const count = await page.locator('a[href^="/design-system/blocks/"]').count()
  expect(count).toBeGreaterThan(5)
})

test('every block/hero detail route renders without app errors', async ({ page }) => {
  // Visits ~30 detail routes, each a first-time `next dev` compile, in one test.
  test.setTimeout(240_000)
  const errors = trackConsoleErrors(page)
  await page.goto('/design-system/blocks')

  const hrefs = await page
    .locator('a[href^="/design-system/blocks/"]')
    .evaluateAll((els) =>
      Array.from(
        new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))),
      ).filter((h): h is string => Boolean(h)),
    )
  expect(hrefs.length).toBeGreaterThan(5)

  for (const href of hrefs) {
    const start = errors.length
    const res = await page.goto(href, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${href} HTTP status`).toBeLessThan(400)
    await expect(page.locator('h1, h2').first()).toBeVisible()
    expect(appErrors(errors.slice(start)), `console errors on ${href}`).toEqual([])
  }
})
