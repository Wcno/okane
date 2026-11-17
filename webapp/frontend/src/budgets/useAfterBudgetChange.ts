import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenNotice } from '../lib/notice'
import type { Budget } from './api'
import { budgetNotice, type BudgetChange } from './notices'
import { budgetsOf } from './presentation'

/** What every change of a Budget ends with: back to the list of its month, with a notice. */
export function useAfterBudgetChange() {
  const navigate = useNavigate()
  return useCallback(
    (change: BudgetChange, budget: Pick<Budget, 'amount' | 'categoryId' | 'month'>) => {
      const state: ScreenNotice = { notice: budgetNotice(change, budget) }
      navigate(budgetsOf(budget.month), { state })
    },
    [navigate],
  )
}
