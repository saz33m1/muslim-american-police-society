'use client'

import Link from 'next/link'
import { BookLock, CalendarPlus, MapPin, UserCog } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

type Props = {
  eyebrow?: string | null
  welcomeText?: string | null
  showMosaic?: boolean | null
}

/**
 * Member portal landing hero (client). The greeting is personalized from the
 * Outseta SDK (loaded by OutsetaScript) and falls back to "Welcome!" with no
 * layout shift. Three tiles are real in-page anchors; "Update Profile" is a real
 * button that opens the Outseta profile modal. The optional photo collage is a
 * faded, masked background layer inside the bounded card, so the hero reads as
 * intentional with or without it and the old empty-gap can't recur (symmetric
 * card padding makes top/bottom breathing room equal by construction).
 */
export const MemberPortalHeroBlock: React.FC<Props> = ({ eyebrow, welcomeText, showMosaic }) => {
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    let cancelled = false
    const resolve = async (): Promise<boolean> => {
      const getUser = window.Outseta?.getUser
      if (!getUser) return false
      try {
        const user = await getUser()
        const full = typeof user?.Name === 'string' ? user.Name : ''
        const name = (typeof user?.FirstName === 'string' && user.FirstName) || full.split(' ')[0] || ''
        if (!cancelled && name) setFirstName(name)
        return true
      } catch {
        return false
      }
    }
    // The SDK loads async (afterInteractive); poll briefly until getUser exists.
    let tries = 0
    const id = setInterval(async () => {
      tries += 1
      if ((await resolve()) || tries > 20) clearInterval(id)
    }, 250)
    void resolve()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <section className="container mt-16">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />

        {showMosaic && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/3 bg-cover bg-center opacity-[0.28] md:block"
            style={{
              backgroundImage: 'url(/portal/member-collage.webp)',
              maskImage: 'linear-gradient(to right, transparent, black 40%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)',
            }}
          />
        )}

        <div className="relative p-8 md:p-12">
          {eyebrow && (
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-content-secondary">
              {eyebrow}
            </p>
          )}
          <h1 className="type-display text-foreground">
            {`Welcome${firstName ? `, ${firstName}` : ''}!`}
          </h1>
          {welcomeText && (
            <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-content-secondary">
              {welcomeText}
            </p>
          )}

          <nav aria-label="Member quick actions" className="mt-8">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <li>
                <Tile
                  desc="Upcoming member-only events"
                  href="#upcoming-events"
                  icon={<CalendarPlus className="size-6" />}
                  label="Sign Up for Events"
                  primary
                />
              </li>
              <li>
                <Tile
                  desc="Manage your member profile"
                  icon={<UserCog className="size-6" />}
                  label="Update Profile"
                  onClick={() => window.Outseta?.profile?.open()}
                />
              </li>
              <li>
                <Tile
                  desc="Career, community, and policy"
                  href="#programs-services"
                  icon={<BookLock className="size-6" />}
                  label="Member-Only Resources"
                />
              </li>
              <li>
                <Tile
                  desc="Local chapters and chats"
                  href="#state-committee"
                  icon={<MapPin className="size-6" />}
                  label="State Committee Pages"
                />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </section>
  )
}

type TileProps = {
  href?: string
  onClick?: () => void
  primary?: boolean
  icon: React.ReactNode
  label: string
  desc: string
}

const Tile: React.FC<TileProps> = ({ href, onClick, primary, icon, label, desc }) => {
  const className = cn(
    'flex h-full min-h-[7rem] flex-col gap-2 rounded-md p-4 text-left transition-colors',
    primary
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'border border-border bg-card text-foreground hover:border-primary',
  )
  const inner = (
    <>
      <span className={primary ? 'text-primary-foreground' : 'text-primary'}>{icon}</span>
      <span className="text-base font-semibold">{label}</span>
      <span className={cn('text-sm', primary ? 'text-primary-foreground/80' : 'text-content-secondary')}>
        {desc}
      </span>
    </>
  )
  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    )
  }
  return (
    <button className={cn(className, 'w-full')} onClick={onClick} type="button">
      {inner}
    </button>
  )
}
