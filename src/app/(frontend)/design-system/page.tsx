import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'

const brandPrimary = ['lightest', 'lighter', 'light', 'base', 'dark', 'darker', 'darkest'] as const
const brandSecondary = brandPrimary
const neutral = [
  'white',
  'lightest',
  'lighter',
  'light',
  'base',
  'dark',
  'darker',
  'darkest',
  'black',
] as const
const radii = ['xs', 'sm', 'md', 'lg', 'xl', 'pill'] as const
const spacing = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'huge', 'xhuge'] as const

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-s">
    <h2 className="text-2xl">{title}</h2>
    {children}
  </section>
)

const Swatch = ({ label, color }: { label: string; color: string }) => (
  <div className="flex flex-col gap-1">
    <div
      className="h-16 w-full rounded-md border border-border"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
)

const TypeSpec = ({
  as: El = 'p',
  className,
  token,
  spec,
  sample,
}: {
  as?: React.ElementType
  className?: string
  token: string
  spec: string
  sample: string
}) => (
  <div className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0">
    <El className={className}>{sample}</El>
    <span className="text-xs text-muted-foreground">
      <code>{token}</code> · {spec}
    </span>
  </div>
)

export default function StyleGuidePage() {
  return (
    <main className="container flex flex-col gap-xl py-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-4xl">Design System</h1>
        <p className="text-muted-foreground">
          Design tokens — brand palette, radius, typography, spacing, semantic tiers. See the{' '}
          <Link className="text-link underline" href="/design-system/blocks">
            blocks gallery
          </Link>{' '}
          for every layout block and hero rendered with sample data.
        </p>
        <div>
          <ThemeToggle />
        </div>
      </header>

      <Section title="Brand — primary (navy)">
        <div className="grid grid-cols-2 gap-s sm:grid-cols-4 lg:grid-cols-7">
          {brandPrimary.map((step) => (
            <Swatch key={step} label={`primary-${step}`} color={`var(--brand-primary-${step})`} />
          ))}
        </div>
      </Section>

      <Section title="Brand — secondary (maroon)">
        <div className="grid grid-cols-2 gap-s sm:grid-cols-4 lg:grid-cols-7">
          {brandSecondary.map((step) => (
            <Swatch
              key={step}
              label={`secondary-${step}`}
              color={`var(--brand-secondary-${step})`}
            />
          ))}
        </div>
      </Section>

      <Section title="Neutral scale">
        <div className="grid grid-cols-3 gap-s sm:grid-cols-5 lg:grid-cols-9">
          {neutral.map((step) => (
            <Swatch key={step} label={`neutral-${step}`} color={`var(--neutral-${step})`} />
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-s">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-s pt-xs">
          <span className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white">
            Brand primary
          </span>
          <span className="rounded-md bg-brand-secondary px-4 py-2 text-sm font-medium text-white">
            Brand secondary (maroon)
          </span>
          <span className="text-content-secondary text-sm">
            Maroon is a deliberate accent (<code>bg-brand-secondary</code>), not the neutral
            secondary action.
          </span>
        </div>
      </Section>

      <Section title="Radius scale">
        <div className="flex flex-wrap items-end gap-l">
          {radii.map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <div className="h-20 w-20 bg-primary" style={{ borderRadius: `var(--rad-${r})` }} />
              <span className="text-xs text-muted-foreground">rad-{r}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <p className="max-w-prose text-sm text-content-secondary">
          One scale. Headings are Lora (serif) at a uniform 600 weight, so hierarchy is carried by
          size alone and a section heading can never out-weigh the hero display. Body, lead, and
          labels are Montserrat. Hardcoded headings use the <code>.type-*</code> classes; RichText /
          prose headings get the same sizes from the typography config. Sizes show mobile → desktop.
        </p>
        <div className="flex max-w-prose flex-col gap-4">
          <TypeSpec
            as="p"
            className="type-display"
            token=".type-display"
            spec="Lora · 600 · 40 → 56px · hero headline (prose h1)"
            sample="Empowering public servants"
          />
          <TypeSpec
            as="h2"
            className="type-h2"
            token=".type-h2"
            spec="Lora · 600 · 30 → 36px · section heading"
            sample="What our community says"
          />
          <TypeSpec
            as="h3"
            className="type-h3"
            token=".type-h3"
            spec="Lora · 600 · 24 → 30px · subsection"
            sample="Leadership and board"
          />
          <TypeSpec
            as="h4"
            className="type-h4"
            token=".type-h4"
            spec="Lora · 600 · 20px · card title"
            sample="Program graduate"
          />
          <TypeSpec
            as="h5"
            className="type-h5"
            token=".type-h5"
            spec="Lora · 600 · 18px · compact card title"
            sample="Recent photo gallery"
          />
          <TypeSpec
            as="p"
            className="type-lead"
            token=".type-lead"
            spec="Montserrat · 400 · 18 → 20px · intro / standfirst"
            sample="A short lead paragraph that introduces the section below it."
          />
          <TypeSpec
            token="(base body)"
            spec="Montserrat · 400 · 16px"
            sample="Body copy. The quick brown fox jumps over the lazy dog."
          />
          <TypeSpec
            className="type-quote"
            token=".type-quote"
            spec="Lora · 500 · 20 → 24px · pull-quote"
            sample="The roadmap into public service I did not know existed."
          />
          <div className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0">
            <div className="prose dark:prose-invert">
              <blockquote>
                “The best of people are those who are most beneficial to people” (Hadith of the
                Prophet Muhammad, Al-Tabarani, 5937)
              </blockquote>
            </div>
            <span className="text-xs text-muted-foreground">
              <code>blockquote</code> · Montserrat · 300 · italic · RichText citation / attribution
            </span>
          </div>
          <TypeSpec
            as="span"
            className="type-eyebrow text-primary"
            token=".type-eyebrow"
            spec="Montserrat · 600 · 14px · uppercase · label / eyebrow"
            sample="In their words"
          />
          <TypeSpec
            className="type-small text-content-secondary"
            token=".type-small"
            spec="Montserrat · 400 · 14px · caption / meta"
            sample="Caption and metadata text."
          />
          <TypeSpec
            className="font-mono text-sm"
            token="font-mono"
            spec="Geist Mono · code and data"
            sample="const slug = 'maps' // 0123456789"
          />
        </div>
      </Section>

      <Section title="Spacing scale">
        <div className="flex flex-col gap-xxs">
          {spacing.map((s) => (
            <div key={s} className="flex items-center gap-s">
              <span className="w-16 text-xs text-muted-foreground">space-{s}</span>
              <div className="h-4 shrink-0 bg-secondary" style={{ width: `var(--space-${s})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Semantic tiers (theme-aware)">
        <div className="grid gap-s sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-md border border-border bg-background p-m text-foreground">
            <span className="font-semibold">Surface — primary</span>
            <span className="text-content-secondary text-sm">
              Secondary text on primary surface
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-secondary p-m text-foreground">
            <span className="font-semibold">Surface — secondary</span>
            <span className="text-content-secondary text-sm">Muted background tier</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border-strong bg-surface-tertiary p-m text-foreground">
            <span className="font-semibold">Surface — tertiary</span>
            <span className="text-sm">Strong border</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md bg-surface-alternate p-m text-content-alternate">
            <span className="font-semibold">Surface — alternate</span>
            <span className="text-sm">Inverts between light/dark</span>
            <a className="text-link-alternate text-sm underline" href="#">
              Alternate link
            </a>
          </div>
          <div className="flex flex-col gap-1 rounded-md bg-surface-success p-m text-content-success">
            <span className="font-semibold">Success</span>
            <span className="text-sm">Surface + content</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md bg-surface-error p-m text-content-error">
            <span className="font-semibold">Error</span>
            <span className="text-sm">Surface + content</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-l pt-xs">
          <a className="text-link underline" href="#">
            Primary link
          </a>
          <a className="text-link-secondary underline" href="#">
            Secondary link
          </a>
        </div>
      </Section>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'Design System',
  robots: { index: false, follow: false },
}
