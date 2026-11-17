import { useExpenseRevision } from '../expenses/revision'
import { useLoaded } from '../lib/useLoaded'
import { getNetWorthHistory } from './api'

/** The Patrimonio series; it loads again when an Expense changes elsewhere, such as in the quick form. */
export function useNetWorthHistory() {
  return useLoaded(getNetWorthHistory, useExpenseRevision())
}
