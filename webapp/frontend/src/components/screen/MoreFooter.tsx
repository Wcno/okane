import { useEffect, useRef } from 'react'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import type { PagedFeed } from '../../lib/usePagedFeed'

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

/** What closes a paged list: how many are shown, and the button for the next page. */
export function MoreFooter<Item extends { id: number }>({
  feed,
  noun,
  rowId,
  showMore,
}: {
  feed: PagedFeed<Item>
  /** Plural, as the count sentence says it: "gastos". */
  noun: string
  rowId: (item: Item) => string
  showMore: () => void
}) {
  const rememberAsked = useKeepFocusAfterMore(feed, rowId)
  const isLoadingMore = feed.more.status === 'loading'

  return (
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
  )
}
