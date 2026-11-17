import { useExpenseRevision } from '../expenses/revision'
import { useLoaded } from '../lib/useLoaded'
import { getDashboard } from './api'

/** The Panel's figures; they load again when an Expense changes elsewhere, such as in the quick form. */
export function useDashboard() {
  return useLoaded(getDashboard, useExpenseRevision())
}
