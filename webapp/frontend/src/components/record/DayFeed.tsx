import { useEffect, useRef, type ReactNode } from 'react'
import { dayHeading, groupByDay } from '../../lib/dayGroups'
import { todayInPanama } from '../../lib/dates'
import type { RecordFeed } from '../../lib/useRecordFeed'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'

/**
 * After "Mostrar más" the keyboard stays where it was: on the button while
 * there are more pages, else on the first row that arrived, so it does not
 * fall back to the top of the page.
 */
function useKeepFocusAfterMore<Entry>(feed: RecordFeed<Entry>, rowId: (record: Entry) => string) {
  const asked = useRef(false)
  const shown = useRef(feed.records.length)

  useEffect(() => {
    const previous = shown.current
    shown.current = feed.records.length
    if (!asked.current || feed.records.length <= previous) return
    asked.current = false
    if (feed.nextPage === null) document.getElementById(rowId(feed.records[previous]))?.focus()
  }, [feed.records, feed.nextPage, rowId])

  return () => {
    asked.current = true
  }
}

/** Records that share a heading: a day, or a type. */
export interface FeedGroup<Entry> {
  key: string
  heading: string
  records: Entry[]
}

/**
 * The records of a feed under a heading for each day (or the groups `groupBy`
 * makes), then the count and "Mostrar más". `row` renders one record as a
 * RecordRow whose link has `rowId`.
 */
export function DayFeed<Entry extends { id: number; date: string }>({
  feed,
  showMore,
  row,
  rowId,
  countText,
  groupBy,
}: {
  feed: RecordFeed<Entry>
  showMore: () => void
  row: (record: Entry) => ReactNode
  rowId: (record: Entry) => string
  /** "Mostrando 50 de 51 gastos." */
  countText: (shown: number, total: number) => string
  /** Another way to group the records than one group per day. */
  groupBy?: (records: Entry[]) => FeedGroup<Entry>[]
}) {
  const today = todayInPanama()
  const rememberAsked = useKeepFocusAfterMore(feed, rowId)
  const isLoadingMore = feed.more.status === 'loading'
  const groups: FeedGroup<Entry>[] = groupBy
    ? groupBy(feed.records)
    : groupByDay(feed.records).map((group) => ({
        key: `day-${group.date}`,
        heading: dayHeading(group.date, today),
        records: group.records,
      }))

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={group.key} className={cardClassName}>
          <h2 id={group.key} className="text-[1rem] font-medium text-ink-2">
            {group.heading}
          </h2>
          <ul className="mt-3 divide-y divide-line">{group.records.map(row)}</ul>
        </section>
      ))}

      <div className="flex flex-col items-center gap-3 px-1 pt-1">
        <p className="text-[0.87rem] text-ink-3" role="status">
          {countText(feed.records.length, feed.total)}
        </p>
        {feed.more.status === 'failed' && <FormAlert>{feed.more.message}</FormAlert>}
        {feed.nextPage !== null && (
          <button
            type="button"
            // Not `disabled`: a disabled button drops the keyboard out of the page.
            aria-disabled={isLoadingMore}
            onClick={() => {
              if (isLoadingMore) return
              rememberAsked()
              showMore()
            }}
            className={`${smallSecondaryButtonClassName} justify-center aria-disabled:opacity-70`}
          >
            {isLoadingMore ? 'Cargando…' : feed.more.status === 'failed' ? 'Reintentar' : 'Mostrar más'}
          </button>
        )}
      </div>
    </div>
  )
}
