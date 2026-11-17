import { useCallback, useState } from 'react'
import { useLoaded, type Loaded } from '../lib/useLoaded'
import { useSessionEnd } from '../lib/useSessionEnd'
import { listExpenses, type Expense, type ExpensePage } from './api'
import { useExpenseRevision } from './revision'

export interface ExpenseFeed {
  expenses: Expense[]
  total: number
  nextPage: number | null
  more: { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string }
}

/** The pages after the first one, which belong to one load of the first page. */
interface LaterPages extends ExpenseFeed {
  firstPage: ExpensePage
}

/**
 * The User's Expenses, newest first. The first page loads like any screen's
 * data (and again when an Expense changes elsewhere); "more" appends the next.
 */
export function useExpenseFeed() {
  const endSession = useSessionEnd()
  const revision = useExpenseRevision()
  const { state, retry } = useLoaded(() => listExpenses(1), revision)
  const [later, setLater] = useState<LaterPages | null>(null)

  const firstPage = state.status === 'ready' ? state.value : null
  // Pages kept from before a reload of the first page no longer line up with it.
  const current = later !== null && later.firstPage === firstPage ? later : null

  const showMore = useCallback(async () => {
    if (firstPage === null) return
    const base: LaterPages = current ?? {
      firstPage,
      expenses: [],
      nextPage: firstPage.nextPage,
      total: firstPage.total,
      more: { status: 'idle' },
    }
    if (base.nextPage === null || base.more.status === 'loading') return
    setLater({ ...base, more: { status: 'loading' } })
    try {
      const page = await listExpenses(base.nextPage)
      setLater((now) => {
        const shown = new Set([...firstPage.expenses, ...(now?.expenses ?? [])].map((expense) => expense.id))
        return {
          firstPage,
          // A registration between two pages shifts the offsets; never show a row twice.
          expenses: [...(now?.expenses ?? []), ...page.expenses.filter((expense) => !shown.has(expense.id))],
          nextPage: page.nextPage,
          total: page.total,
          more: { status: 'idle' },
        }
      })
    } catch (error) {
      if (endSession(error)) return
      setLater({ ...base, more: { status: 'failed', message: (error as Error).message } })
    }
  }, [firstPage, current, endSession])

  const feed: Loaded<ExpenseFeed> =
    state.status !== 'ready'
      ? state
      : {
          status: 'ready',
          value: {
            expenses: [...state.value.expenses, ...(current?.expenses ?? [])],
            total: current?.total ?? state.value.total,
            nextPage: current ? current.nextPage : state.value.nextPage,
            more: current?.more ?? { status: 'idle' },
          },
        }

  return { state: feed, retry, showMore }
}
