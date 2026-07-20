import { test, expect } from '@playwright/test'

// One assertion per hero variant. (#122)
test('highImpact home hero drives the dark header theme', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header[data-theme="dark"]')).toBeVisible()
})

test('mediumImpact split hero renders a 4:3 image on a hub', async ({ page }) => {
  await page.goto('/programs')
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('.aspect-\\[4\\/3\\] img').first()).toBeVisible()
})

test('lowImpact mini-hero breadcrumb links back to its hub', async ({ page }) => {
  await page.goto('/about-us/mission')
  const crumb = page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'About Us' })
  await expect(crumb).toHaveAttribute('href', '/about-us')
})

test('PostHero renders the post-title masthead', async ({ page }) => {
  await page.goto('/latest-updates/maps-academy-climbing-the-federal-ladder')
  await expect(page.locator('h1').first()).toBeVisible()
})
