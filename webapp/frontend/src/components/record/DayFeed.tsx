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
function useKeepFocusAfterMore<Record>(feed: RecordFeed<Record>, rowId: (record: Record) => string) {
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

/**
 * The records of a feed under a heading for each day, then the count and
 * "Mostrar más". `row` renders one record as a RecordRow whose link has `rowId`.
 */
export function DayFeed<Record extends { id: number; date: string }>({
  feed,
  showMore,
  row,
  rowId,
  countText,
}: {
  feed: RecordFeed<Record>
  showMore: () => void
  row: (record: Record) => ReactNode
  rowId: (record: Record) => string
  /** "Mostrando 50 de 51 gastos." */
  countText: (shown: number, total: number) => string
}) {
  const today = todayInPanama()
  const rememberAsked = useKeepFocusAfterMore(feed, rowId)
  const isLoadingMore = feed.more.status === 'loading'

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {groupByDay(feed.records).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`} className={cardClassName}>
          <h2 id={`day-${group.date}`} className="text-[1rem] font-medium text-ink-2">
            {dayHeading(group.date, today)}
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
