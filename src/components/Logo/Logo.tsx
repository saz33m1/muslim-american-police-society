import clsx from 'clsx'
import React from 'react'

import { cn } from '@/utilities/ui'
import { LOGO } from '@/utilities/brand'

type Variant = 'primary' | 'secondary'

interface Props {
  className?: string
  /** primary = header mark, secondary = footer mark */
  variant?: Variant
  /**
   * Force a single asset instead of auto theme-switching. Use on surfaces whose
   * background does not follow the theme (e.g. the always-dark footer).
   */
  theme?: 'light' | 'dark'
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = ({
  className,
  variant = 'primary',
  theme,
  loading = 'lazy',
  priority = 'low',
}: Props) => {
  const { width, height } = LOGO.dims[variant]
  // cn (twMerge) so a caller-passed height (e.g. the header's h-11) overrides the
  // 34px default instead of colliding with it; surfaces that pass nothing stay 34px.
  const base = cn('h-[34px] w-auto', className)
  // alt lives on each <img> directly (not in the spread) so jsx-a11y can see it.
  const alt = LOGO.alt
  const common = {
    width,
    height,
    loading,
    fetchPriority: priority,
    decoding: 'async' as const,
  }

  // Fixed surface: render a single asset (no theme switching).
  if (theme) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img {...common} alt={alt} className={base} src={`/logo-${variant}-${theme}.svg`} />
    )
  }

  // Theme-aware: dark-ink mark in light themes, white mark in dark themes.
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...common}
        alt={alt}
        className={clsx(base, 'block dark:hidden')}
        src={`/logo-${variant}-light.svg`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...common}
        alt={alt}
        className={clsx(base, 'hidden dark:block')}
        src={`/logo-${variant}-dark.svg`}
      />
    </>
  )
}
