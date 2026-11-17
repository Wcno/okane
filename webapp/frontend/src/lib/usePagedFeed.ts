import { useCallback, useState } from 'react'
import { useLoaded, type Loaded } from './useLoaded'
import { useSessionEnd } from './useSessionEnd'

/** One page of a list as api-service answers it. */
export interface Page<Item> {
  items: Item[]
  total: number
  nextPage: number | null
}

export interface PagedFeed<Item> extends Page<Item> {
  more: { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string }
}

/** The pages after the first one, which belong to one load of the first page. */
interface LaterPages<Item> extends PagedFeed<Item> {
  firstPage: Page<Item>
}

/**
 * A list read one page at a time: the first page loads like any screen's data
 * (and again when `reloadOn` changes); "more" appends the next page. `loadPage`
 * must be a stable function, defined outside the component.
 */
export function usePagedFeed<Item extends { id: number }>(
  loadPage: (page: number) => Promise<Page<Item>>,
  reloadOn?: unknown,
) {
  const endSession = useSessionEnd()
  const { state, retry } = useLoaded(() => loadPage(1), reloadOn)
  const [later, setLater] = useState<LaterPages<Item> | null>(null)

  const firstPage = state.status === 'ready' ? state.value : null
  // Pages kept from before a reload of the first page no longer line up with it.
  const current = later !== null && later.firstPage === firstPage ? later : null

  const showMore = useCallback(async () => {
    if (firstPage === null) return
    const base: LaterPages<Item> = current ?? {
      firstPage,
      items: [],
      nextPage: firstPage.nextPage,
      total: firstPage.total,
      more: { status: 'idle' },
    }
    if (base.nextPage === null || base.more.status === 'loading') return
    setLater({ ...base, more: { status: 'loading' } })
    try {
      const page = await loadPage(base.nextPage)
      setLater((now) => {
        const shown = new Set([...firstPage.items, ...(now?.items ?? [])].map((item) => item.id))
        return {
          firstPage,
          // A registration between two pages shifts the offsets; never show a row twice.
          items: [...(now?.items ?? []), ...page.items.filter((item) => !shown.has(item.id))],
          nextPage: page.nextPage,
          total: page.total,
          more: { status: 'idle' },
        }
      })
    } catch (error) {
      if (endSession(error)) return
      setLater({ ...base, more: { status: 'failed', message: (error as Error).message } })
    }
  }, [firstPage, current, endSession, loadPage])

  const feed: Loaded<PagedFeed<Item>> =
    state.status !== 'ready'
      ? state
      : {
          status: 'ready',
          value: {
            items: [...state.value.items, ...(current?.items ?? [])],
            total: current?.total ?? state.value.total,
            nextPage: current ? current.nextPage : state.value.nextPage,
            more: current?.more ?? { status: 'idle' },
          },
        }

  return { state: feed, retry, showMore }
}
