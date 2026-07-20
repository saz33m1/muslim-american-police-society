import { test, expect } from '@playwright/test'

// Mobile viewport. (#131)
test.use({ viewport: { width: 390, height: 844 } })

const PAGES = ['/', '/programs', '/latest-updates/maps-academy-climbing-the-federal-ladder']

for (const path of PAGES) {
  test(`no horizontal overflow on ${path} (mobile)`, async ({ page }) => {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${path} horizontal overflow (px)`).toBeLessThanOrEqual(1)
  })
}

test('mobile nav overlay opens', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.locator('#primary-menu')).toBeVisible()
})
