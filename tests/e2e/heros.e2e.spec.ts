import { test, expect } from '@playwright/test'

// One assertion per hero variant. (#122)
//
// highImpact and mediumImpact are asserted against the design-system showroom
// rather than a seeded page: the starter seed (scripts/seed-pages.ts) uses
// lowImpact heroes throughout, because both richer variants require a Media doc
// this org doesn't have artwork for yet. Move these back onto real routes once
// the homepage and hub pages carry their own imagery.
test('highImpact hero renders its media-backed masthead', async ({ page }) => {
  await page.goto('/design-system/blocks/hero.highImpact')
  await expect(page.locator('h1').first()).toBeVisible()
})

test('mediumImpact split hero renders a 4:3 image', async ({ page }) => {
  await page.goto('/design-system/blocks/hero.mediumImpact')
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
  await page.goto('/latest-updates/welcome-to-our-new-site')
  await expect(page.locator('h1').first()).toBeVisible()
})
