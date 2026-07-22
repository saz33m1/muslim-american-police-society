// @vitest-environment node
// The join-page CTAs open the Outseta register widget via this handler (same SDK
// the footer/nav login uses). Guards the click behavior without a DOM render:
// stub window.Outseta, assert the widget opens and navigation is prevented.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { openOutsetaRegister } from '@/components/OutsetaRegisterLink'

declare const globalThis: { window?: unknown }

afterEach(() => {
  delete globalThis.window
})

describe('openOutsetaRegister', () => {
  it('opens the Outseta register widget and prevents default navigation', () => {
    const open = vi.fn()
    globalThis.window = { Outseta: { auth: { open } } }
    const preventDefault = vi.fn()

    openOutsetaRegister({ preventDefault } as unknown as React.MouseEvent)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(open).toHaveBeenCalledWith({ widgetMode: 'register' })
  })

  it('is safe when the Outseta SDK has not loaded (no throw)', () => {
    globalThis.window = {} // SDK absent
    const preventDefault = vi.fn()

    expect(() =>
      openOutsetaRegister({ preventDefault } as unknown as React.MouseEvent),
    ).not.toThrow()
    expect(preventDefault).toHaveBeenCalledOnce()
  })
})
