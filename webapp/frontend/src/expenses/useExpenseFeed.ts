import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { SessionEndedError } from '../lib/http'
import { listExpenses, type Expense } from './api'
import { useExpenseRevision } from './changes'

export type FeedState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | {
      status: 'ready'
      expenses: Expense[]
      total: number
      nextPage: number | null
      more: { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string }
    }

/** The User's Expenses, newest first, one page at a time; "more" appends the next page. */
export function useExpenseFeed() {
  const { reload: reloadSession } = useAuth()
  const revision = useExpenseRevision()
  const [state, setState] = useState<FeedState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    listExpenses(1).then(
      (page) =>
        current &&
        setState({ status: 'ready', expenses: page.expenses, total: page.total, nextPage: page.nextPage, more: { status: 'idle' } }),
      (error: Error) => {
        if (!current) return
        if (error instanceof SessionEndedError) reloadSession()
        else setState({ status: 'failed', message: error.message })
      },
    )
    return () => {
      current = false
    }
  }, [attempt, revision, reloadSession])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  const showMore = useCallback(async () => {
    if (state.status !== 'ready' || state.nextPage === null || state.more.status === 'loading') return
    const { nextPage } = state
    setState({ ...state, more: { status: 'loading' } })
    try {
      const page = await listExpenses(nextPage)
      setState((previous) =>
        previous.status !== 'ready'
          ? previous
          : {
              ...previous,
              // A registration between two pages shifts the offsets; never show a row twice.
              expenses: [
                ...previous.expenses,
                ...page.expenses.filter((next) => !previous.expenses.some((shown) => shown.id === next.id)),
              ],
              total: page.total,
              nextPage: page.nextPage,
              more: { status: 'idle' },
            },
      )
    } catch (error) {
      if (error instanceof SessionEndedError) {
        reloadSession()
        return
      }
      const message = (error as Error).message
      setState((previous) => (previous.status !== 'ready' ? previous : { ...previous, more: { status: 'failed', message } }))
    }
  }, [state, reloadSession])

  return { state, retry, showMore }
}
