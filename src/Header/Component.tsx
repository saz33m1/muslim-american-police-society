import { getCachedGlobal } from '@/utilities/getGlobals'
import { HeaderClient } from './Component.client'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

export async function Header() {
  const data = (await getCachedGlobal('header', 1)()) as HeaderType
  return <HeaderClient navGroups={data?.navGroups ?? []} flatLinks={data?.flatLinks ?? []} />
}
