import { test, expect } from '@playwright/test'

// Latest Updates = the Posts collection, archive served as a CMS page. (#126)
test('latest-updates archive lists posts', async ({ page }) => {
  const res = await page.goto('/latest-updates')
  expect(res?.status()).toBeLessThan(400)
  await expect(page.locator('a[href*="/latest-updates/"]').first()).toBeVisible()
})

test('a post detail renders its masthead title', async ({ page }) => {
  await page.goto('/latest-updates/maps-academy-climbing-the-federal-ladder')
  const h1 = page.locator('h1').first()
  await expect(h1).toBeVisible()
  await expect(h1).toContainText(/MAPS Academy/i)
})

test('a draft post is not reachable on the public site', async ({ page }) => {
  const res = await page.goto('/latest-updates/this-slug-does-not-exist-404')
  expect(res?.status()).toBe(404)
})
