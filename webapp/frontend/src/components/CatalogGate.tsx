import type { ReactNode } from 'react'
import { listCategories } from '../categories/api'
import { setCatalog } from '../categories/catalog'
import { useLoaded } from '../lib/useLoaded'
import { Pending } from './screen/Screen'

/** Loads the Categories before any screen names one; a failure can be retried. */
export function CatalogGate({ children }: { children: ReactNode }) {
  const { state, retry } = useLoaded(async () => {
    const categories = await listCategories()
    setCatalog(categories)
    return categories
  })

  if (state.status !== 'ready') return <Pending state={state} retry={retry} loading="Cargando Okane…" />
  return <>{children}</>
}
