'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, LogIn, LogOut, SearchIcon } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/utilities/ui'
import { DONATE_CTA } from '@/utilities/brand'
import { DesktopNav } from './DesktopNav'
import type { Header } from '@/payload-types'

// window.Outseta is typed centrally in src/types/outseta.d.ts.

// Nav IA is managed in the `header` global (src/Header/config.ts) and passed in
// as props. A group's optional `href` makes its section title a link to a
// hub/landing page; the items are the deeper destinations. `gated` marks the
// members-only column (lock icon + account control).
type NavGroup = NonNullable<Header['navGroups']>[number]
type NavLink = NonNullable<Header['flatLinks']>[number]

/**
 * Header navigation. On desktop (lg+) DesktopNav renders a complete horizontal
 * bar (nav groups, flat links, search, and the prominent Login/Logout + Donate
 * CTAs); below lg a hamburger opens a full-screen overlay menu. The overlay lays
 * the IA out in grouped columns, with the flat links and the Donate CTA. The
 * mobile top bar carries its own Outseta login/logout icon and a search icon
 * (all `lg:hidden`, since DesktopNav supplies the desktop copies): the
 * nocode module (monitorDom) shows exactly one auth anchor by auth state via the
 * `data-o-anonymous` / `data-o-authenticated` attributes, and each click calls
 * the Outseta SDK directly (#115). Closes on Esc, backdrop, route change, or a
 * link.
 */
export const NavMenu: React.FC<{ navGroups: NavGroup[]; flatLinks: NavLink[] }> = ({
  navGroups,
  flatLinks,
}) => {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  const close = useCallback(() => setOpen(false), [])

  // Portal target is only available on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Close when the route changes (a link was followed).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  // Lock body scroll, manage focus, and trap Tab + wire Esc while open.
  useEffect(() => {
    if (open && !wasOpenRef.current) closeRef.current?.focus()
    else if (!open && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = open

    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return
      // Keep focus inside the dialog (aria-modal doesn't enforce this).
      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey && (activeEl === first || !root.contains(activeEl))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (activeEl === last || !root.contains(activeEl))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <div className="flex items-center gap-2">
      {/* Desktop horizontal nav (lg+). Below lg it is hidden and the hamburger
          overlay below takes over. */}
      <div className="hidden lg:flex">
        <DesktopNav navGroups={navGroups} flatLinks={flatLinks} />
      </div>

      {/* Outseta auth control (mobile top bar, lg:hidden — DesktopNav carries the
          lg+ copies). The nocode module (monitorDom) toggles visibility via
          data-o-anonymous / data-o-authenticated (verified: shows exactly one by
          auth state), across every matching element regardless of breakpoint. The
          click is the SDK directly — auth.open() pops the login modal in-page (no
          hosted-page redirect, so the cookie is written same-origin and it works on
          localhost); logout() clears the session. text-foreground tracks the
          header's per-page data-theme. */}
      <button
        aria-label="Log in"
        className="p-2 text-foreground hover:text-primary lg:hidden"
        data-o-anonymous="true"
        onClick={() => window.Outseta?.auth?.open({ widgetMode: 'login' })}
        type="button"
      >
        <LogIn className="size-5" />
      </button>
      <button
        aria-label="Log out"
        className="p-2 text-foreground hover:text-primary lg:hidden"
        data-o-authenticated="true"
        onClick={() => window.Outseta?.logout?.()}
        type="button"
      >
        <LogOut className="size-5" />
      </button>
      <Link
        aria-label="Search"
        className="p-2 text-foreground hover:text-primary lg:hidden"
        href="/search"
      >
        <SearchIcon className="size-5" />
      </Link>
      <button
        aria-controls="primary-menu"
        aria-expanded={open}
        aria-label="Open menu"
        className="inline-flex items-center rounded-md p-2 text-foreground hover:text-primary lg:hidden"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <MenuIcon />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            aria-label="Site menu"
            aria-modal="true"
            className="fixed inset-0 z-[200] overflow-y-auto bg-background text-content lg:hidden"
            id="primary-menu"
            ref={dialogRef}
            role="dialog"
          >
            {/* Close button shares the top row with the first section heading:
                absolutely positioned and container-aligned to the top-right, and
                click-through (pointer-events-none wrapper, pointer-events-auto
                button) so the nav links beneath it stay tappable. */}
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10">
              <div className="container flex justify-end">
                <button
                  aria-label="Close menu"
                  className="pointer-events-auto rounded-md p-2 text-content hover:text-primary"
                  onClick={close}
                  ref={closeRef}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <nav className="container grid gap-x-10 gap-y-8 pt-6 pb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-4 border-b border-border pb-2 font-serif text-lg font-semibold text-content">
                    {group.href ? (
                      <Link
                        className="transition-colors hover:text-primary"
                        href={group.href}
                        onClick={close}
                      >
                        {group.label}
                      </Link>
                    ) : (
                      group.label
                    )}
                  </p>
                  <ul className="space-y-2.5">
                    {(group.items ?? []).map((item) => (
                      <li key={item.href}>
                        <MenuLink
                          active={pathname === item.href}
                          gated={group.gated ?? undefined}
                          href={item.href}
                          onClick={close}
                        >
                          {item.label}
                        </MenuLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="container flex flex-col gap-6 border-t border-border py-6 lg:flex-row lg:items-center lg:justify-between">
              {flatLinks.length > 0 && (
                <ul className="flex flex-wrap gap-x-8 gap-y-3">
                  {flatLinks.map((item) => (
                    <li key={item.href}>
                      <MenuLink active={pathname === item.href} href={item.href} onClick={close}>
                        {item.label}
                      </MenuLink>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {/* Member login/logout live in the always-visible header top bar
                  (see the NavMenu top row), wired to the Outseta SDK. Donate is
                  the single prominent CTA here (filled primary). */}
                <Link
                  className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  href={DONATE_CTA.href}
                  onClick={close}
                >
                  {DONATE_CTA.label}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

const MenuLink: React.FC<{
  active: boolean
  href: string
  onClick: () => void
  gated?: boolean
  children: React.ReactNode
}> = ({ active, href, onClick, gated, children }) => (
  <Link
    className={cn(
      'text-base transition-colors hover:text-primary',
      active ? 'font-medium text-primary' : 'text-content-secondary',
    )}
    href={href}
    onClick={onClick}
  >
    {gated && <Lock aria-hidden="true" className="mr-1.5 inline-block size-3.5 align-[-0.15em]" />}
    {children}
  </Link>
)

const MenuIcon: React.FC = () => (
  <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.75"
    />
  </svg>
)

const CloseIcon: React.FC = () => (
  <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
  </svg>
)
