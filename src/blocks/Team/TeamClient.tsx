'use client'

import NextImage from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

/** A group a member belongs to: stable value + display label. */
export type TeamTab = { value: string; label: string }

export type TeamMember = {
  id: string
  name: string
  jobTitle?: string
  jobTitleSecondary?: string
  categories: TeamTab[]
  email?: string
  linkedin?: string
  photoSrc?: string
  photoAlt?: string
  /** Pre-rendered rich-text bio (server-rendered, passed across the RSC boundary). */
  bio?: React.ReactNode
}

// Auto-fit track minimum per density — larger min = fewer per row = airier.
const densityClass: Record<string, string> = {
  airy: 'sm:[grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))]',
  medium: 'sm:[grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]',
  compact: 'sm:[grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]',
  tight: 'sm:[grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]',
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/**
 * Editorial team directory — chromeless circular headshots, each opening a
 * focus-managed bio modal (Esc / backdrop to close, focus sent to the close
 * button on open and restored to the opening person on close). Two layouts:
 * `grouped` stacks a labelled section per category; `tabs` shows one grid with a
 * category filter bar.
 */
export const TeamClient: React.FC<{
  density: string
  /** Category values in the editor's configured order; groups sort to match. */
  groupOrder?: string[]
  layout: 'grouped' | 'tabs'
  members: TeamMember[]
}> = ({ density, groupOrder, layout, members }) => {
  const [active, setActive] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  // De-duplicated groups present in the data, members preserved. Order follows
  // the editor's configured category order when given, else first appearance.
  const groups = useMemo(() => {
    const order = new Map<string, string>()
    for (const m of members)
      for (const c of m.categories) if (!order.has(c.value)) order.set(c.value, c.label)
    const list = Array.from(order, ([value, label]) => ({
      value,
      label,
      members: members.filter((m) => m.categories.some((c) => c.value === value)),
    })).filter((g) => g.members.length > 0)
    if (groupOrder?.length) {
      const rank = (v: string) => {
        const i = groupOrder.indexOf(v)
        return i === -1 ? groupOrder.length : i
      }
      list.sort((a, b) => rank(a.value) - rank(b.value))
    }
    return list
  }, [members, groupOrder])

  const showTabs = layout === 'tabs' && groups.length > 1

  const visible = useMemo(
    () =>
      active === 'all'
        ? members
        : members.filter((m) => m.categories.some((c) => c.value === active)),
    [active, members],
  )

  const openMember = useMemo(() => members.find((m) => m.id === openId) ?? null, [members, openId])

  const open = useCallback((id: string, el: HTMLElement) => {
    triggerRef.current = el
    setOpenId(id)
  }, [])

  const close = useCallback(() => setOpenId(null), [])

  // Restore focus in an effect (after the dialog unmounts) — see MediaGallery.
  useEffect(() => {
    const isOpen = openId !== null
    if (isOpen && !wasOpenRef.current) closeRef.current?.focus()
    else if (!isOpen && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = isOpen

    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openId, close])

  return (
    <>
      {showTabs ? (
        <>
          <div className="mb-12 flex flex-wrap justify-center gap-2" role="tablist">
            <FilterTab active={active === 'all'} label="All" onClick={() => setActive('all')} />
            {groups.map((g) => (
              <FilterTab
                active={active === g.value}
                key={g.value}
                label={g.label}
                onClick={() => setActive(g.value)}
              />
            ))}
          </div>
          <PersonGrid density={density} members={visible} onOpen={open} />
        </>
      ) : (
        groups.map((g) => (
          <div className="mb-16 last:mb-0 md:mb-20" key={g.value}>
            {/* A lone group needs no divider label — the surrounding page or
                block header already names it; a heading would just repeat it. */}
            {groups.length > 1 && (
              <h3 className="mb-8 border-b border-[var(--brand-secondary-base)]/40 pb-3 type-h3 text-content">
                {g.label}
              </h3>
            )}
            <PersonGrid density={density} members={g.members} onOpen={open} />
          </div>
        ))
      )}

      {openMember && (
        <div
          aria-label={openMember.name}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          role="dialog"
        >
          <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-xl sm:p-8">
            <button
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-2 text-content-secondary hover:text-primary"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              <CloseIcon />
            </button>

            {/* Photo floats so the identity and bio flow up beside it — a short
                bio reads without a gap, a long one wraps past the photo. */}
            <div className="text-center sm:text-left">
              <Photo
                className="mx-auto mb-4 size-28 sm:float-left sm:mx-0 sm:mb-2 sm:mr-6 sm:size-32"
                member={openMember}
              />
              <h3 className="type-h3">{openMember.name}</h3>
              {openMember.jobTitle && <p className="mt-1 text-primary">{openMember.jobTitle}</p>}
              {openMember.jobTitleSecondary && (
                <p className="text-primary">{openMember.jobTitleSecondary}</p>
              )}
              {openMember.categories.length > 0 && (
                <p className="mt-1 text-sm text-content-secondary">
                  {openMember.categories.map((c) => c.label).join(' · ')}
                </p>
              )}
              {(openMember.email || openMember.linkedin) && (
                <div className="mt-4 flex items-center justify-center gap-3.5 sm:justify-start">
                  {openMember.linkedin && (
                    <a
                      aria-label={`${openMember.name} on LinkedIn`}
                      className="text-content-secondary transition-colors hover:text-primary"
                      href={openMember.linkedin}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <LinkedInIcon />
                    </a>
                  )}
                  {openMember.email && (
                    <a
                      aria-label={`Email ${openMember.name}`}
                      className="text-content-secondary transition-colors hover:text-primary"
                      href={`mailto:${openMember.email}`}
                    >
                      <EmailIcon />
                    </a>
                  )}
                </div>
              )}
              {openMember.bio && <div className="mt-4 text-left">{openMember.bio}</div>}
              <div className="clear-both" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** A density-aware grid of people. Shared by the grouped and tabs layouts. */
const PersonGrid: React.FC<{
  density: string
  members: TeamMember[]
  onOpen: (id: string, el: HTMLElement) => void
}> = ({ density, members, onOpen }) => (
  <ul
    className={cn(
      'grid grid-cols-1 justify-items-center sm:justify-center',
      density === 'tight' ? 'gap-y-6 sm:gap-x-5 sm:gap-y-8' : 'gap-y-12 sm:gap-x-10 sm:gap-y-14',
      densityClass[density] ?? densityClass['medium'],
    )}
  >
    {members.map((m) => (
      <li key={m.id}>
        <Person density={density} member={m} onOpen={onOpen} />
      </li>
    ))}
  </ul>
)

const FilterTab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    aria-selected={active}
    className={cn(
      'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border text-content-secondary hover:border-primary hover:text-primary',
    )}
    onClick={onClick}
    role="tab"
    type="button"
  >
    {label}
  </button>
)

/**
 * One person — a chromeless circular avatar with the name/title centred beneath.
 * The whole stack is the modal trigger. Hoisted to module scope so its identity
 * is stable across re-renders (modal toggles), keeping the captured button valid
 * for focus restoration. See MediaGallery's Thumb.
 */
const Person: React.FC<{
  density: string
  member: TeamMember
  onOpen: (id: string, el: HTMLElement) => void
}> = ({ density, member, onOpen }) => {
  const tight = density === 'tight'
  return (
    <button
      aria-haspopup="dialog"
      className="group flex w-full flex-col items-center text-center focus:outline-none"
      onClick={(e) => onOpen(member.id, e.currentTarget)}
      type="button"
    >
      <Photo
        className={cn(
          'ring-1 ring-border/60 transition duration-300 group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background',
          tight ? 'size-14 md:size-16' : 'size-28 md:size-36',
        )}
        member={member}
      />
      <span
        className={cn(
          'font-serif font-medium text-content transition-colors group-hover:text-primary',
          tight ? 'mt-2 text-sm md:text-base' : 'mt-5 text-lg md:text-xl',
        )}
      >
        {member.name}
      </span>
      {member.jobTitle && (
        <span
          className={cn(
            'max-w-[16rem] leading-snug text-content-secondary',
            tight ? 'mt-0.5 text-xs' : 'mt-1 text-sm',
          )}
        >
          {member.jobTitle}
        </span>
      )}
      {member.jobTitleSecondary && (
        <span
          className={cn(
            'max-w-[16rem] leading-snug text-content-secondary',
            tight ? 'text-xs' : 'text-sm',
          )}
        >
          {member.jobTitleSecondary}
        </span>
      )}
      {!tight && (
        <span className="mt-2 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100">
          Read bio
          <ArrowIcon />
        </span>
      )}
    </button>
  )
}

/** Chromeless circular headshot, or initials on a brand tint when no photo. */
const Photo: React.FC<{ className?: string; member: TeamMember }> = ({ className, member }) => {
  if (member.photoSrc) {
    return (
      <span
        className={cn(
          'relative block aspect-square overflow-hidden rounded-full bg-surface-secondary',
          className,
        )}
      >
        <NextImage
          alt={member.photoAlt || member.name}
          className="object-cover"
          fill
          sizes="(max-width: 640px) 50vw, 180px"
          src={member.photoSrc}
        />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex aspect-square items-center justify-center rounded-full bg-primary/10 font-serif text-4xl font-semibold text-primary',
        className,
      )}
    >
      {initials(member.name)}
    </span>
  )
}

const CloseIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const ArrowIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
)

const LinkedInIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    className="size-6"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3ZM8 18C8.27614 18 8.5 17.7761 8.5 17.5V10.5C8.5 10.2239 8.27614 10 8 10H6.5C6.22386 10 6 10.2239 6 10.5V17.5C6 17.7761 6.22386 18 6.5 18H8ZM7.25 9C6.42157 9 5.75 8.32843 5.75 7.5C5.75 6.67157 6.42157 6 7.25 6C8.07843 6 8.75 6.67157 8.75 7.5C8.75 8.32843 8.07843 9 7.25 9ZM17.5 18C17.7761 18 18 17.7761 18 17.5V12.9C18.0325 11.3108 16.8576 9.95452 15.28 9.76C14.177 9.65925 13.1083 10.1744 12.5 11.1V10.5C12.5 10.2239 12.2761 10 12 10H10.5C10.2239 10 10 10.2239 10 10.5V17.5C10 17.7761 10.2239 18 10.5 18H12C12.2761 18 12.5 17.7761 12.5 17.5V13.75C12.5 12.9216 13.1716 12.25 14 12.25C14.8284 12.25 15.5 12.9216 15.5 13.75V17.5C15.5 17.7761 15.7239 18 16 18H17.5Z"
      fillRule="evenodd"
    />
  </svg>
)

const EmailIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    className="size-6"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m22 6c0-1.1-.9-2-2-2h-16c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2zm-2 0-8 5-8-5zm0 12h-16v-10l8 5 8-5z" />
  </svg>
)
