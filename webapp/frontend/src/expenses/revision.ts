import { useSyncExternalStore } from 'react'

let revision = 0
const listeners = new Set<() => void>()

/** Tells the screens that list Expenses that one was registered, changed or deleted elsewhere. */
export function announceExpenseRevision() {
  revision += 1
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useExpenseRevision = () => useSyncExternalStore(subscribe, () => revision)
