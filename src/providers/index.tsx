import React from 'react'

import type { Theme } from './Theme/types'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
  initialHeaderTheme?: Theme | null
}> = ({ children, initialHeaderTheme = null }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider initialTheme={initialHeaderTheme}>{children}</HeaderThemeProvider>
    </ThemeProvider>
  )
}
