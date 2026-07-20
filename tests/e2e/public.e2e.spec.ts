import { test, expect } from '@playwright/test'

import { appErrors, trackConsoleErrors } from '../helpers/e2e'

// Critical-path public journeys: home, the two hub pages, and a representative
// interior [...slug] page. Each must load, show a non-empty h1, and not log any
// app-owned console error. (#121)
const PAGES: { path: string; h1?: RegExp }[] = [
  { path: '/', h1: /Empowering/i },
  { path: '/programs', h1: /serve/i },
  { path: '/about-us' },
  { path: '/about-us/mission' },
]

for (const { path, h1 } of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page)
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} HTTP status`).toBeLessThan(400)

    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()
    await expect(heading).not.toHaveText('')
    if (h1) await expect(heading).toContainText(h1)

    expect(appErrors(errors), `console errors on ${path}`).toEqual([])
  })
}
