import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Collect console.error messages and uncaught page errors into a list you can
 * assert on after navigation. Attach once per page before the first goto.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

// Third-party / environmental noise that a render smoke shouldn't fail on: the
// Outseta auth widget, favicon, media 404s, ResizeObserver loop notices, and the
// hydration-attribute warning some browser extensions inject.
const IGNORE = [
  /Outseta/i,
  /favicon/i,
  /ResizeObserver/i,
  /the server responded with a status of 4\d\d/i,
  /Failed to load resource/i,
  /hydrat/i,
  /cz-shortcut/i,
]

/** Drop known third-party / environmental noise, leaving app-owned errors. */
export function appErrors(errors: string[]): string[] {
  return errors.filter((e) => !IGNORE.some((re) => re.test(e)))
}

/** Open the full-screen header nav overlay and wait for it to be visible. */
export async function openNavMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.locator('#primary-menu')).toBeVisible()
}
