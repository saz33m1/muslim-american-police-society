import { test, expect } from '@playwright/test'

import { openNavMenu } from '../helpers/e2e'

// Below lg the header is a full-screen overlay opened by the hamburger; at lg+ a
// desktop mega menu (DesktopNav) replaces it. These specs exercise the mobile
// overlay at a phone viewport; desktop mega-menu coverage is tracked in #236.
// (#124, updated for the desktop/mobile split)
test.use({ viewport: { width: 390, height: 844 } })

test('nav overlay opens with hub links and closes', async ({ page }) => {
  await page.goto('/')
  await openNavMenu(page)
  const menu = page.locator('#primary-menu')

  // Group labels double as links to the section hub (the single front door).
  await expect(menu.getByRole('link', { name: 'About Us', exact: true })).toHaveAttribute(
    'href',
    '/about-us',
  )
  await expect(menu.getByRole('link', { name: 'Programs', exact: true })).toHaveAttribute(
    'href',
    '/programs',
  )

  await page.getByRole('button', { name: 'Close menu' }).click()
  await expect(menu).toBeHidden()
})

test('hub link in the overlay navigates', async ({ page }) => {
  await page.goto('/')
  await openNavMenu(page)
  await page.locator('#primary-menu').getByRole('link', { name: 'Programs', exact: true }).click()
  await expect(page).toHaveURL(/\/programs$/)
})

test('the header search affordance routes to /search', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\/search/)
})
