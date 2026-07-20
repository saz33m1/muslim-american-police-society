'use client'

import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // One-shot sync to the data-theme attribute (external store) on mount.
    const current = document.documentElement.getAttribute('data-theme')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === 'dark' ? 'dark' : 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setTheme(next)
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      Theme: {theme} → toggle
    </Button>
  )
}
