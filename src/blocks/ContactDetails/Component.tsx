import Link from 'next/link'
import React from 'react'

import type { ContactDetailsBlock as ContactDetailsBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'

type Item = NonNullable<ContactDetailsBlockProps['items']>[number]

const icons: Record<string, string> = {
  email: 'M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A15 15 0 014 5a1 1 0 011-1z',
  location: 'M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z M12 10a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 7v5l3 2 M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  link: 'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1.5 1.5 M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1.5-1.5',
}

const Icon: React.FC<{ name: string }> = ({ name }) => (
  <svg
    aria-hidden="true"
    className="size-5 shrink-0 text-primary"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d={icons[name] ?? icons.link} />
  </svg>
)

/** Resolve the link for an item: explicit href, else auto mailto/tel. */
const hrefFor = (item: Item): string | undefined => {
  if (item.href) return item.href
  const v = (item.value || '').trim()
  if (item.icon === 'email') return `mailto:${v}`
  if (item.icon === 'phone') return `tel:${v.replace(/[^+\d]/g, '')}`
  return undefined
}

/**
 * A column of contact methods — email, phone, address, hours — each with an
 * icon, optional label, and a value that auto-links for email and phone.
 * Designed to sit beside a Form block on a contact page.
 */
export const ContactDetailsBlock: React.FC<ContactDetailsBlockProps> = (props) => {
  const { heading, intro, items } = props

  return (
    <section className="container">
      {/* max-w-2xl, not max-w-xl: the brand theme defines --spacing-xl (4rem),
          which shadows Tailwind's max-w-xl and collapses the column to 64px. */}
      <div className="max-w-2xl">
        {heading && <h2 className="type-h2">{heading}</h2>}
        {intro && <RichText className="mt-4" data={intro} enableGutter={false} />}

        <ul className="mt-8 flex flex-col gap-6">
          {(items || []).map((item, i) => {
            const href = hrefFor(item)
            const value = <span className="whitespace-pre-line">{item.value}</span>
            return (
              <li className="flex items-start gap-4" key={i}>
                <span className="mt-0.5">
                  <Icon name={item.icon} />
                </span>
                <div>
                  {item.label && (
                    <p className="text-sm font-semibold text-content-secondary">{item.label}</p>
                  )}
                  {href ? (
                    <Link className="transition-colors hover:text-primary" href={href}>
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
