'use client'

import React from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

// Sentinel href a CMSLink CTA uses to open the Outseta signup modal instead of
// navigating. CMSLink delegates to this component when its href is `#o-register`,
// so membership CTAs (hero, pricing tiers) trigger registration through the same
// SDK the footer/nav login uses (see PortalLogin.tsx). No plan UID — the register
// widget lets the visitor pick a plan.
// ponytail: generic register; add planUid when the Outseta plans are known.
export const OUTSETA_REGISTER_HREF = '#o-register'

export function openOutsetaRegister(e: React.MouseEvent): void {
  e.preventDefault()
  window.Outseta?.auth?.open({ widgetMode: 'register' })
}

type OutsetaRegisterLinkProps = {
  appearance?: 'inline' | ButtonProps['variant']
  size?: ButtonProps['size'] | null
  className?: string
  label?: string | null
  children?: React.ReactNode
}

export const OutsetaRegisterLink: React.FC<OutsetaRegisterLinkProps> = ({
  appearance = 'inline',
  size,
  className,
  label,
  children,
}) => {
  if (appearance === 'inline') {
    return (
      <a className={cn(className)} href="#" onClick={openOutsetaRegister} role="button">
        {label}
        {children}
      </a>
    )
  }

  return (
    <Button
      asChild
      className={className}
      size={appearance === 'link' ? 'clear' : size}
      variant={appearance}
    >
      <a href="#" onClick={openOutsetaRegister} role="button">
        {label}
        {children}
      </a>
    </Button>
  )
}
