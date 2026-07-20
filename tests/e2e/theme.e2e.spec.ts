import { test, expect } from '@playwright/test'

// Theme is driven by data-theme on <html>; the footer selector sets and persists
// it (localStorage). (#125)
test('footer theme selector flips and persists data-theme', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const selector = page.getByRole('combobox', { name: 'Select a theme' })

  await selector.click()
  await page.getByRole('option', { name: 'Dark' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  // Re-navigate (more robust than reload against the dev server) to prove the
  // choice persists across a fresh page load.
  await page.goto('/')
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await selector.click()
  await page.getByRole('option', { name: 'Light' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
})
