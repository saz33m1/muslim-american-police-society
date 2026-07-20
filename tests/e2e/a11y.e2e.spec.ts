import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

// Accessibility checks with axe-core. Two passes: the standard WCAG 2.0/2.1 A+AA
// ruleset, and the enhanced (AAA) contrast rule the repo's brand text pairs are
// designed to meet. Fails only on serious/critical impact. (#130)
const BLOCKING = new Set(['critical', 'serious'])
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

type Violation = {
  id: string
  impact?: string | null
  help: string
  nodes: { target: unknown[] }[]
}

// The per-page header theme is now resolved server-side (#134), so it's correct
// in the first paint — there's no post-mount flip to wait out. Scanning at `load`
// is enough; no artificial settle delay needed.
async function gotoSettled(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'load' })
}

function summarize(violations: Violation[]): string {
  if (violations.length === 0) return 'no violations'
  return violations
    .map(
      (v) =>
        `• ${v.id} [${v.impact}] — ${v.help} (${v.nodes.length} node(s))\n    ` +
        v.nodes
          .slice(0, 4)
          .map((n) => (n.target as string[]).join(' '))
          .join('\n    '),
    )
    .join('\n')
}

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'programs hub', path: '/programs' },
  { name: 'post detail', path: '/latest-updates/maps-academy-climbing-the-federal-ladder' },
  { name: 'admin login', path: '/admin/login' },
]

for (const { name, path } of PAGES) {
  test(`a11y WCAG A/AA: ${name}`, async ({ page }) => {
    await gotoSettled(page, path)
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
    const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ''))
    expect(blocking, summarize(blocking)).toEqual([])
  })
}

// Enhanced-contrast (AAA) spot-check on the public content surfaces.
for (const { name, path } of [
  { name: 'home', path: '/' },
  { name: 'programs hub', path: '/programs' },
]) {
  test(`a11y AAA contrast: ${name}`, async ({ page }) => {
    await gotoSettled(page, path)
    const { violations } = await new AxeBuilder({ page })
      .withRules(['color-contrast-enhanced'])
      .analyze()
    const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ''))
    expect(blocking, summarize(blocking)).toEqual([])
  })
}
