'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { Logo } from '@/components/Logo/Logo'
import { NavMenu } from './NavMenu'
import type { Header as HeaderType } from '@/payload-types'

export const HeaderClient: React.FC<{
  navGroups: NonNullable<HeaderType['navGroups']>
  flatLinks: NonNullable<HeaderType['flatLinks']>
}> = ({ navGroups, flatLinks }) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  /* Seed from the server-resolved per-page theme (HeaderThemeProvider) so the
     first paint matches SSR — no flash of the wrong header theme. */
  const [theme, setTheme] = useState<string | null>(headerTheme ?? null)
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Don't clear the server-seeded theme on initial mount; only reset when the
    // user navigates to a new route (the destination page re-asserts its own).
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    // Follow the header theme a page sets; when none is set (null), fall back to
    // no override so the header inherits the global theme instead of sticking to
    // the previous page's value. Mirrors an external context (HeaderTheme).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (headerTheme !== theme) setTheme(headerTheme ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <header className="container relative z-20   " {...(theme ? { 'data-theme': theme } : {})}>
      <div className="h-[var(--header-height)] flex items-center justify-between">
        <Link href="/">
          <Logo className="h-11" variant="primary" loading="eager" priority="high" />
        </Link>
        <NavMenu navGroups={navGroups} flatLinks={flatLinks} />
      </div>
    </header>
  )
}
