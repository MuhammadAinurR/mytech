'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

/**
 * Open/close state for a create-or-edit dialog. `?new=1` (from the command
 * palette) opens it in create mode on load; closing removes the parameter.
 */
export function useEntityDialog<T>() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<{ open: boolean; item: T | null }>(() => ({
    open: searchParams.get('new') === '1',
    item: null,
  }))

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }))
    if (searchParams.has('new')) {
      const params = new URLSearchParams(searchParams)
      params.delete('new')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const actions = useMemo(
    () => ({
      openCreate: () => setState({ open: true, item: null }),
      openEdit: (item: T) => setState({ open: true, item }),
    }),
    [],
  )

  return { ...state, ...actions, close }
}
