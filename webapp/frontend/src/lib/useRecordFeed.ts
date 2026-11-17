import { useCallback, useState } from 'react'
import { useSessionEnd } from './useSessionEnd'
import { useLoaded, type Loaded } from './useLoaded'

/** One page of a list of records, newest first. */
export interface RecordPage<Record> {
  records: Record[]
  total: number
  nextPage: number | null
}

/** The pages after the first one, which belong to one load of the first page. */
interface LaterPages<Record> {
  firstPage: RecordPage<Record>
  records: Record[]
  nextPage: number | null
  total: number
  more: { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string }
}

export interface RecordFeed<Record> {
  records: Record[]
  total: number
  nextPage: number | null
  more: LaterPages<Record>['more']
}

/**
 * The User's records of one kind, newest first. The first page loads like any
 * screen's data (and again when `revision` changes, because one changed
 * elsewhere); "more" appends the next.
 */
export function useRecordFeed<Record extends { id: number }>(
  load: (page: number) => Promise<RecordPage<Record>>,
  revision: number,
) {
  const endSession = useSessionEnd()
  const { state, retry } = useLoaded(() => load(1), revision)
  const [later, setLater] = useState<LaterPages<Record> | null>(null)

  const firstPage = state.status === 'ready' ? state.value : null
  // Pages kept from before a reload of the first page no longer line up with it.
  const current = later !== null && later.firstPage === firstPage ? later : null

  const showMore = useCallback(async () => {
    if (firstPage === null) return
    const base: LaterPages<Record> = current ?? {
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
        const shown = new Set([...firstPage.records, ...(now?.records ?? [])].map((record) => record.id))
        return {
          firstPage,
          // A registration between two pages shifts the offsets; never show a row twice.
          records: [...(now?.records ?? []), ...page.records.filter((record) => !shown.has(record.id))],
          nextPage: page.nextPage,
          total: page.total,
          more: { status: 'idle' },
        }
      })
    } catch (error) {
      if (endSession(error)) return
      setLater({ ...base, more: { status: 'failed', message: (error as Error).message } })
    }
  }, [firstPage, current, load, endSession])

  const feed: Loaded<RecordFeed<Record>> =
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
