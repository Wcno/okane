import { useMovementsRevision } from '../movements/revision'
import { useLoaded } from '../lib/useLoaded'
import { getNetWorthHistory } from './api'

/** The Patrimonio series; it loads again when a record changes elsewhere, such as in the quick form. */
export function useNetWorthHistory() {
  return useLoaded(getNetWorthHistory, useMovementsRevision())
}
