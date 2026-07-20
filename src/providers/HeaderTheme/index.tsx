'use client'

import type { Theme } from '@/providers/Theme/types'

import React, { createContext, useCallback, use, useState } from 'react'

export interface ContextType {
  headerTheme?: Theme | null
  setHeaderTheme: (theme: Theme | null) => void
}

const initialContext: ContextType = {
  headerTheme: undefined,
  setHeaderTheme: () => null,
}

const HeaderThemeContext = createContext(initialContext)

export const HeaderThemeProvider = ({
  children,
  initialTheme = null,
}: {
  children: React.ReactNode
  initialTheme?: Theme | null
}) => {
  // Seeded from the server-resolved per-page theme so SSR and the first client
  // render agree (no flash, no hydration mismatch). null = inherit global theme.
  const [headerTheme, setThemeState] = useState<Theme | undefined | null>(initialTheme)

  const setHeaderTheme = useCallback((themeToSet: Theme | null) => {
    setThemeState(themeToSet)
  }, [])

  return <HeaderThemeContext value={{ headerTheme, setHeaderTheme }}>{children}</HeaderThemeContext>
}

export const useHeaderTheme = (): ContextType => use(HeaderThemeContext)
