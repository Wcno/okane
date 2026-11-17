import { useCallback, useState } from 'react'
import type { RecordPage } from './recordPage'
import { useSessionEnd } from './useSessionEnd'
import { useLoaded, type Loaded } from './useLoaded'

/** The pages after the first one, which belong to one load of the first page. */
interface LaterPages<Entry> {
  firstPage: RecordPage<Entry>
  records: Entry[]
  nextPage: number | null
  total: number
  more: { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string }
}

export interface RecordFeed<Entry> {
  records: Entry[]
  total: number
  nextPage: number | null
  more: LaterPages<Entry>['more']
}

const byId = (record: { id: number }) => record.id

/**
 * The User's records of one kind, newest first. The first page loads like any
 * screen's data (and again when `revision` changes, because one changed
 * elsewhere); "more" appends the next.
 */
export function useRecordFeed<Entry extends { id: number }>(
  load: (page: number) => Promise<RecordPage<Entry>>,
  revision: number | string,
  /** What tells two records apart; an `id` alone when every record is of one kind. */
  identify: (record: Entry) => string | number = byId,
) {
  const endSession = useSessionEnd()
  const { state, retry } = useLoaded(() => load(1), revision)
  const [later, setLater] = useState<LaterPages<Entry> | null>(null)

  const firstPage = state.status === 'ready' ? state.value : null
  // Pages kept from before a reload of the first page no longer line up with it.
  const current = later !== null && later.firstPage === firstPage ? later : null

  const showMore = useCallback(async () => {
    if (firstPage === null) return
    const base: LaterPages<Entry> = current ?? {
      firstPage,
      records: [],
      nextPage: firstPage.nextPage,
      total: firstPage.total,
      more: { status: 'idle' },
    }
    if (base.nextPage === null || base.more.status === 'loading') return
    setLater({ ...base, more: { status: 'loading' } })
    try {
      const page = await load(base.nextPage)
      setLater((now) => {
        const shown = new Set([...firstPage.records, ...(now?.records ?? [])].map(identify))
        return {
          firstPage,
          // A registration between two pages shifts the offsets; never show a row twice.
          records: [...(now?.records ?? []), ...page.records.filter((record) => !shown.has(identify(record)))],
          nextPage: page.nextPage,
          total: page.total,
          more: { status: 'idle' },
        }
      })
    } catch (error) {
      if (endSession(error)) return
      setLater({ ...base, more: { status: 'failed', message: (error as Error).message } })
    }
  }, [firstPage, current, load, identify, endSession])

  const feed: Loaded<RecordFeed<Entry>> =
    state.status !== 'ready'
      ? state
      : {
          status: 'ready',
          value: {
            records: [...state.value.records, ...(current?.records ?? [])],
            total: current?.total ?? state.value.total,
            nextPage: current ? current.nextPage : state.value.nextPage,
            more: current?.more ?? { status: 'idle' },
          },
        }

  return { state: feed, retry, showMore }
}
