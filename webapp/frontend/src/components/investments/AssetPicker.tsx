import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ASSET_QUERY_MAX_LENGTH, searchAssets, type Asset, type AssetSearch } from '../../investments/api'
import { useSessionEnd } from '../../lib/useSessionEnd'
import { smallSecondaryButtonClassName } from '../buttons'
import { TextField } from '../TextField'
import { FieldError } from '../record/RecordFields'

type Lookup =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'failed'; message: string }
  | ({ status: 'found' } & AssetSearch)

const NOT_FOUND = 'No encontramos Activos con esa búsqueda. Prueba con el símbolo, por ejemplo AAPL, o con parte del nombre.'
const PROVIDER_DOWN =
  'No pudimos consultar el servicio de cotizaciones, así que solo vemos los Activos que Okane ya conoce.'

/** The pause after the last key before the search runs, to spare the quotes provider's limit. */
const SEARCH_DELAY_MS = 350

const resultsCount = (count: number) => (count === 1 ? '1 resultado' : `${count} resultados`)

/**
 * Picks an Asset from the catalog: the User searches by symbol or name and
 * chooses one result, so there is no free text and two markets stay apart.
 * It is a combobox (WAI-ARIA): the search runs after a pause in typing or on Enter,
 * the arrows walk the listbox of results, Enter picks and Escape closes it.
 */
export function AssetPicker({
  id,
  asset,
  onChange,
  errors,
}: {
  id: string
  asset: Asset | null
  onChange: (asset: Asset | null) => void
  errors?: string[]
}) {
  const [query, setQuery] = useState('')
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' })
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const endSession = useSessionEnd()
  const latestSearch = useRef(0)
  const pendingSearch = useRef<number>(undefined)
  const input = useRef<HTMLInputElement>(null)
  const changeButton = useRef<HTMLButtonElement>(null)
  const justChosen = useRef(false)

  // Choosing or clearing swaps the controls, so the keyboard follows to the one that replaces it.
  useEffect(() => {
    if (justChosen.current) {
      justChosen.current = false
      if (asset) changeButton.current?.focus()
      else input.current?.focus()
    }
  }, [asset])

  const runSearch = useCallback(
    async (text: string) => {
      const attempt = ++latestSearch.current
      setLookup({ status: 'searching' })
      try {
        const found = await searchAssets(text)
        if (attempt !== latestSearch.current) return
        setLookup({ status: 'found', ...found })
        setActive(-1)
        setIsOpen(found.assets.length > 0)
      } catch (failure) {
        if (attempt !== latestSearch.current || endSession(failure)) return
        setLookup({ status: 'failed', message: failure instanceof Error ? failure.message : 'No pudimos buscar.' })
        setIsOpen(false)
      }
    },
    [endSession],
  )

  // Searching as the User types, after a pause.
  useEffect(() => {
    const text = query.trim()
    if (!text) return
    pendingSearch.current = window.setTimeout(() => void runSearch(text), SEARCH_DELAY_MS)
    return () => window.clearTimeout(pendingSearch.current)
  }, [query, runSearch])

  const type = (text: string) => {
    setQuery(text)
    if (text.trim()) return
    // An emptied field forgets the results and ignores the search still on its way.
    latestSearch.current++
    setLookup({ status: 'idle' })
    setIsOpen(false)
    setActive(-1)
  }

  const search = () => {
    window.clearTimeout(pendingSearch.current)
    const text = query.trim()
    if (!text) {
      input.current?.focus()
      return
    }
    void runSearch(text)
  }

  const results = lookup.status === 'found' ? lookup.assets : []
  const isListOpen = isOpen && results.length > 0
  const listId = `${id}-results`
  const optionId = (index: number) => `${id}-option-${index}`

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (results.length === 0) return
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setIsOpen(true)
        setActive((current) => (current < 0 ? (step === 1 ? 0 : results.length - 1) : (current + step + results.length) % results.length))
        return
      }
      case 'Enter':
        // Enter picks the highlighted result or searches; it must not submit the operation being filled in.
        event.preventDefault()
        if (isListOpen && active >= 0) choose(results[active])
        else search()
        return
      case 'Escape':
        if (isListOpen) {
          event.preventDefault()
          setIsOpen(false)
          setActive(-1)
        }
    }
  }

  const choose = (chosen: Asset | null) => {
    window.clearTimeout(pendingSearch.current)
    latestSearch.current++
    justChosen.current = true
    onChange(chosen)
    setLookup({ status: 'idle' })
    setIsOpen(false)
    setActive(-1)
  }

  return (
    <div>
      {asset ? (
        <div>
          <p id={`${id}-label`} className="text-[0.9rem] font-medium text-ink-2">
            Activo
          </p>
          <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-line-strong bg-surface-2 p-3">
            <div className="min-w-0 flex-1" role="group" aria-labelledby={`${id}-label`}>
              <p className="break-words text-[1rem] font-semibold">{asset.symbol}</p>
              <p className="break-words text-[0.87rem] text-ink-3">
                {asset.name} · {asset.market}
              </p>
            </div>
            <button
              ref={changeButton}
              type="button"
              onClick={() => choose(null)}
              aria-label={`Cambiar el Activo ${asset.symbol}`}
              className={`${smallSecondaryButtonClassName} shrink-0`}
            >
              Cambiar
            </button>
          </div>
          <FieldError id={`${id}-error`} errors={errors} />
        </div>
      ) : (
        <>
          <TextField
            ref={input}
            id={`${id}-query`}
            label="Activo"
            value={query}
            onChange={(event) => type(event.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isListOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={isListOpen && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            maxLength={ASSET_QUERY_MAX_LENGTH}
            placeholder="Símbolo o nombre, por ejemplo AAPL"
            errors={errors}
          />
          <button type="button" onClick={search} className={`${smallSecondaryButtonClassName} mt-2`}>
            <Search size={17} aria-hidden="true" />
            Buscar
          </button>

          <div role="status" aria-live="polite" className="empty:hidden">
            {lookup.status === 'searching' && <p className="mt-2 text-[0.9rem] text-ink-3">Buscando…</p>}
            {lookup.status === 'failed' && <p className="mt-2 text-[0.9rem] text-ink-2">{lookup.message}</p>}
            {lookup.status === 'found' && !lookup.providerAvailable && (
              <p className="mt-2 text-[0.9rem] text-ink-2">{PROVIDER_DOWN}</p>
            )}
            {lookup.status === 'found' && lookup.assets.length === 0 && (
              <p className="mt-2 text-[0.9rem] text-ink-2">{NOT_FOUND}</p>
            )}
            {lookup.status === 'found' && lookup.assets.length > 0 && (
              <p className="mt-2 text-[0.9rem] text-ink-3">{resultsCount(lookup.assets.length)}</p>
            )}
          </div>

          <ul
            id={listId}
            role="listbox"
            aria-label="Resultados de la búsqueda"
            hidden={!isListOpen}
            className="mt-2 divide-y divide-line rounded-2xl border border-line"
          >
            {results.map((found, index) => (
              <li
                key={found.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // Keeps the focus in the field, so the keyboard and the screen reader stay with the combobox.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(found)}
                className={`flex min-h-[56px] cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 ${
                  index === active ? 'bg-surface-2' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[1rem] font-semibold">{found.symbol}</span>
                  <span className="block break-words text-[0.87rem] text-ink-3">{found.name}</span>
                </span>
                <span className="shrink-0 text-[0.87rem] text-ink-3">{found.market}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
