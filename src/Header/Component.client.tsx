'use client'
import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'
import { NavMenu } from './NavMenu'
import type { Header as HeaderType } from '@/payload-types'

/**
 * Solid navy header bar (full-bleed background, container-width content). It is
 * pinned to the dark theme on every page — white logo + white nav — so it reads
 * the same across light and dark pages, and full-bleed heros (which pull up under
 * it and re-pad their own content below --header-height) sit behind the bar
 * without anything being clipped. The old per-page theme-follow logic is gone:
 * the header no longer varies, so it ignores HeaderTheme (heros still set it, but
 * nothing here reads it).
 */
export const HeaderClient: React.FC<{
  navGroups: NonNullable<HeaderType['navGroups']>
  flatLinks: NonNullable<HeaderType['flatLinks']>
}> = ({ navGroups, flatLinks }) => {
  return (
    <header className="relative z-20 bg-brand-primary" data-theme="dark">
      <div className="container">
        <div className="h-[var(--header-height)] flex items-center justify-between">
          <Link href="/">
            <Logo className="h-8" variant="primary" loading="eager" priority="high" />
          </Link>
          <NavMenu navGroups={navGroups} flatLinks={flatLinks} />
        </div>
      </div>
    </header>
  )
}
