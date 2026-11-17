import { useLoaded } from '../lib/useLoaded'
import { getPreferences } from './api'

/** The User's saved preferences, loaded once per screen. */
export function usePreferences() {
  return useLoaded(getPreferences)
}
