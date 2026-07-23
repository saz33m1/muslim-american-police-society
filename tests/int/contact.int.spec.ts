// @vitest-environment node
// Node env (not jsdom): drives the Payload API only. Mirrors committees.int.spec.ts.
import { getPayload, Payload } from 'payload'

import config from '@/payload.config'
import { EMAIL_FROM_ADDRESS } from '@/utilities/brand'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Assumes the standard test DB seed (CI: `seed:pages` before `test:int`; locally
// `npm run seed:pages`). Guards that /contact is the block-built page (LowImpact
// hero + FormBlock) rather than the old placeholder, and that the referenced
// Contact form carries the four fields and a Resend notification email. Structural
// only — no dependency on a live RESEND_API_KEY, so it is CI-safe.
describe('Contact page (form)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  const getPage = async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'contact' } },
      depth: 0,
      limit: 1,
    })
    return docs[0]
  }

  const getForm = async () => {
    const { docs } = await payload.find({
      collection: 'forms',
      where: { title: { equals: 'Contact Form' } },
      limit: 1,
    })
    return docs[0]
  }

  it('composes /contact from a LowImpact hero + a FormBlock', async () => {
    const page = await getPage()
    expect(page, 'contact page must be seeded').toBeDefined()
    expect(page._status).toBe('published')
    expect((page.hero as { type?: string })?.type).toBe('lowImpact')

    const blockTypes = (page.layout ?? []).map((b) => b.blockType)
    expect(blockTypes).toContain('formBlock')
  })

  it('seeds a Contact form with the four fields and a Submit button', async () => {
    const form = await getForm()
    expect(form, 'Contact Form must be seeded').toBeDefined()
    expect(form.submitButtonLabel).toBe('Submit')

    const byName = Object.fromEntries(
      (form.fields ?? []).map((f) => [(f as { name?: string }).name, f]),
    )
    const expectFields: Record<string, { blockType: string; required: boolean }> = {
      name: { blockType: 'text', required: true },
      email: { blockType: 'email', required: true },
      phone: { blockType: 'text', required: false },
      message: { blockType: 'textarea', required: true },
    }
    expect(Object.keys(byName).sort()).toEqual(Object.keys(expectFields).sort())
    for (const [name, want] of Object.entries(expectFields)) {
      const field = byName[name] as { blockType?: string; required?: boolean } | undefined
      expect(field, `field ${name} present`).toBeDefined()
      expect(field!.blockType).toBe(want.blockType)
      expect(Boolean(field!.required)).toBe(want.required)
    }
  })

  it('wires a Resend notification email on the Contact form', async () => {
    const form = await getForm()
    expect(form.emails, 'form needs a notification email').toBeTruthy()
    expect(form.emails!.length).toBeGreaterThan(0)
    const email = form.emails![0]
    expect(email.subject).toContain('{{name}}')
    expect(email.emailFrom ?? '').toContain(EMAIL_FROM_ADDRESS)
  })
})
