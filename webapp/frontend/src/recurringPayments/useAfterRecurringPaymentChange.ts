import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentAccount } from '../accounts/api'
import { announceExpenseRevision } from '../expenses/revision'
import type { ScreenNotice } from '../lib/notice'
import { cancelledNotice, confirmedNotice, ruleNotice, type RuleChange } from './notices'

/** What every change on a full screen of Pagos recurrentes ends with: back to the list, with a notice. */
export function useAfterRecurringPaymentChange() {
  const navigate = useNavigate()

  const toList = useCallback(
    (notice: string) => {
      const state: ScreenNotice = { notice }
      navigate('/recurring-payments', { state })
    },
    [navigate],
  )

  const afterRuleChange = useCallback(
    (change: RuleChange, title: string, amount: string) => toList(ruleNotice(change, title, amount)),
    [toList],
  )

  /** A confirmation made an Expense: the Balance and the Expense lists elsewhere are stale now. */
  const afterConfirmation = useCallback(
    async (title: string, confirmation: { amount: string; accountId: number }) => {
      const account = await currentAccount(confirmation.accountId)
      announceExpenseRevision()
      toList(confirmedNotice(title, confirmation.amount, account))
    },
    [toList],
  )

  const afterCancellation = useCallback(
    (title: string, amount: string) => toList(cancelledNotice(title, amount)),
    [toList],
  )

  return { afterRuleChange, afterConfirmation, afterCancellation }
}
