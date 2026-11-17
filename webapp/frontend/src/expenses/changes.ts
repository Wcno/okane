import { useSyncExternalStore } from 'react'

let revision = 0
const listeners = new Set<() => void>()

/** Tells the screens that list Expenses that one was registered, changed or deleted elsewhere. */
export function announceExpenseChange() {
  revision += 1
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Changes whenever an Expense was registered, changed or deleted: a reason to load the list again. */
export const useExpenseRevision = () => useSyncExternalStore(subscribe, () => revision)
