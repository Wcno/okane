import { useSyncExternalStore } from 'react'

/**
 * A counter that says "a record of this kind changed elsewhere": the screens
 * that list the records watch it and load again. One per kind of record.
 */
export function createRevision() {
  let revision = 0
  const listeners = new Set<() => void>()

  const announce = () => {
    revision += 1
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const useRevision = () => useSyncExternalStore(subscribe, () => revision)

  return { announce, useRevision }
}
