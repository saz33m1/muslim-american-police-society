'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter } from 'next/navigation'

export const Search: React.FC<{ initialValue?: string }> = ({ initialValue = '' }) => {
  const [value, setValue] = useState(initialValue)
  const router = useRouter()

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    // Skip the push when the box already matches the URL — otherwise the empty
    // initial input would wipe a direct /search?q=… link (and the pager's
    // ?q=…&page=N links) on mount.
    if (debouncedValue === initialValue) return
    router.push(`/search${debouncedValue ? `?q=${encodeURIComponent(debouncedValue)}` : ''}`)
  }, [debouncedValue, initialValue, router])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          id="search"
          defaultValue={initialValue}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Search"
        />
        <button type="submit" className="sr-only">
          submit
        </button>
      </form>
    </div>
  )
}
