'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, SearchIcon } from 'lucide-react'
import React from 'react'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import { DONATE_CTA } from '@/utilities/brand'
import type { Header } from '@/payload-types'

// window.Outseta is typed centrally in src/types/outseta.d.ts.

type NavGroup = NonNullable<Header['navGroups']>[number]
type NavLink = NonNullable<Header['flatLinks']>[number]

/**
 * Desktop (lg+) horizontal navigation bar, backed by the Radix navigation-menu
 * primitive. A group with `items` becomes a trigger that opens a dropdown
 * mega-menu panel listing those items; a group with no items stays a plain
 * top-level link (or label). When a group has an `href`, the panel keeps a hub
 * link (its section title) so the landing page is not lost once the label is a
 * trigger. A `gated` group prefixes each panel item with a lock icon, mirroring
 * the overlay's members-only rendering. The Radix viewport is enabled so panels
 * animate open/close.
 *
 * This bar is a COMPLETE nav at lg+: the flat links sit alongside the group
 * triggers, and a distinct utility cluster on the right carries search and the
 * two prominent CTAs — Login/Logout (outline button) and Donate (filled
 * primary) — so the mobile overlay is fully replaced here.
 * text-foreground/hover:text-primary tracks the header's per-page data-theme,
 * matching the mobile top bar and overlay; active items mirror the overlay
 * (text-primary + font-medium). The login/logout anchors duplicate the ones in
 * the mobile top bar (NavMenu): the Outseta nocode module toggles every element
 * matching the data-o-anonymous / data-o-authenticated attributes by auth
 * state, so a second copy is expected.
 */
export const DesktopNav: React.FC<{ navGroups: NavGroup[]; flatLinks: NavLink[] }> = ({
  navGroups,
  flatLinks,
}) => {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-6">
      <NavigationMenu>
        <NavigationMenuList>
          {navGroups.map((group) => {
            const items = group.items ?? []

            // No sub-items: a plain top-level link to the hub, or a bare label.
            if (items.length === 0) {
              return (
                <NavigationMenuItem key={group.label}>
                  {group.href ? (
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                      <Link href={group.href}>{group.label}</Link>
                    </NavigationMenuLink>
                  ) : (
                    <span className={cn(navigationMenuTriggerStyle(), 'cursor-default')}>
                      {group.label}
                    </span>
                  )}
                </NavigationMenuItem>
              )
            }

            // Two-column panel once a group has more than four links. Fill
            // column-major (down the first column, then the second) so items read
            // in their CMS order per column instead of zig-zagging across rows.
            const wide = items.length > 4
            const rows = Math.ceil(items.length / 2)

            return (
              <NavigationMenuItem key={group.label}>
                <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className={cn(wide ? 'w-[34rem]' : 'w-72')}>
                    {group.href && (
                      <NavigationMenuLink asChild>
                        <Link
                          className="mb-1 block border-b border-border pb-2 font-serif text-base font-semibold text-foreground hover:text-primary"
                          href={group.href}
                        >
                          {group.label}
                        </Link>
                      </NavigationMenuLink>
                    )}
                    <ul
                      className={cn('grid gap-0.5', wide && 'grid-flow-col grid-cols-2')}
                      style={wide ? { gridTemplateRows: `repeat(${rows}, auto)` } : undefined}
                    >
                      {items.map((item) => {
                        const active = pathname === item.href
                        return (
                          <li key={item.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                className={cn(
                                  'block text-sm transition-colors hover:text-primary',
                                  active ? 'font-medium text-primary' : 'text-content-secondary',
                                )}
                                href={item.href}
                              >
                                {group.gated && (
                                  <Lock
                                    aria-hidden="true"
                                    className="mr-1.5 inline-block size-3.5 align-[-0.15em]"
                                  />
                                )}
                                {item.label}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )
          })}

          {/* Flat links sit alongside the group triggers as plain top-level
              links, styled like the other top-level nav links with the panel
              items' active-route highlight. */}
          {flatLinks.map((item) => {
            const active = pathname === item.href
            return (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  className={cn(navigationMenuTriggerStyle(), active && 'text-primary')}
                >
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )
          })}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Utility cluster: search plus the two prominent CTAs — Login/Logout
          (inverting outline) and Donate (filled primary), all via the canonical
          Button so they share the design-system focus-visible ring. Login/Logout
          are the Outseta control: the nocode module shows exactly one by auth
          state via data-o-anonymous / data-o-authenticated, and each click calls
          the SDK directly. This duplicates the mobile top-bar copy in NavMenu —
          the module toggles every element matching those attributes. */}
      <div className="flex items-center gap-3">
        <Link aria-label="Search" className="p-2 text-foreground hover:text-primary" href="/search">
          <SearchIcon className="size-5" />
        </Link>
        <Button
          className="px-5 font-semibold"
          data-o-anonymous="true"
          onClick={() => window.Outseta?.auth?.open({ widgetMode: 'login' })}
          type="button"
          variant="headerOutline"
        >
          Login
        </Button>
        <Button
          className="px-5 font-semibold"
          data-o-authenticated="true"
          onClick={() => window.Outseta?.logout?.()}
          type="button"
          variant="headerOutline"
        >
          Logout
        </Button>
        <Button asChild className="px-5 font-semibold" variant="default">
          <Link href={DONATE_CTA.href}>{DONATE_CTA.label}</Link>
        </Button>
      </div>
    </div>
  )
}
