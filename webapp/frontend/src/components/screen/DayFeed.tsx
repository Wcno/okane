import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { todayInPanama } from '../../lib/dates'
import { dayHeading, groupByDay } from '../../lib/days'
import type { PagedFeed } from '../../lib/usePagedFeed'
import { cardClassName } from './Screen'

/**
 * After "Mostrar más" the keyboard stays where it was: on the button while
 * there are more pages, else on the first row that arrived, so it does not
 * fall back to the top of the page.
 */
function useKeepFocusAfterMore<Item extends { id: number }>(feed: PagedFeed<Item>, rowId: (item: Item) => string) {
  const asked = useRef(false)
  const shown = useRef(feed.items.length)

  useEffect(() => {
    const previous = shown.current
    shown.current = feed.items.length
    if (!asked.current || feed.items.length <= previous) return
    asked.current = false
    if (feed.nextPage === null) document.getElementById(rowId(feed.items[previous]))?.focus()
  }, [feed.items, feed.nextPage, rowId])

  return () => {
    asked.current = true
  }
}

/**
 * A list of records grouped under a heading for each day, with the "Mostrar más"
 * control for the next page. `noun` is the plural the count sentence uses.
 */
export function DayFeed<Item extends { id: number; date: string }>({
  feed,
  noun,
  rowId,
  renderRow,
  showMore,
}: {
  feed: PagedFeed<Item>
  noun: string
  rowId: (item: Item) => string
  renderRow: (item: Item) => ReactNode
  showMore: () => void
}) {
  const today = todayInPanama()
  const rememberAsked = useKeepFocusAfterMore(feed, rowId)
  const isLoadingMore = feed.more.status === 'loading'

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {groupByDay(feed.items).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`} className={cardClassName}>
          <h2 id={`day-${group.date}`} className="text-[1rem] font-medium text-ink-2">
            {dayHeading(group.date, today)}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {group.items.map((item) => (
              <Fragment key={item.id}>{renderRow(item)}</Fragment>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-col items-center gap-3 px-1 pt-1">
        <p className="text-[0.87rem] text-ink-3" role="status">
          Mostrando {feed.items.length} de {feed.total} {noun}.
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
