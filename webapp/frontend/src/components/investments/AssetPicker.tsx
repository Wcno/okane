import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ASSET_QUERY_MAX_LENGTH, searchAssets, type Asset, type AssetSearch } from '../../investments/api'
import { useSessionEnd } from '../../lib/useSessionEnd'
import { smallSecondaryButtonClassName } from '../buttons'
import { TextField } from '../TextField'

type Lookup =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'failed'; message: string }
  | ({ status: 'found' } & AssetSearch)

const NOT_FOUND = 'No encontramos Activos con esa búsqueda. Prueba con el símbolo, por ejemplo AAPL, o con parte del nombre.'
const PROVIDER_DOWN =
  'No pudimos consultar el servicio de cotizaciones, así que solo vemos los Activos que Okane ya conoce.'

/**
 * Picks an Asset from the catalog: the User searches by symbol or name and
 * chooses one result, so there is no free text and two markets stay apart.
 * The search runs on request, not on every key, to spare the provider's limit.
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
  const endSession = useSessionEnd()
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

  const search = async () => {
    const text = query.trim()
    if (!text) {
      input.current?.focus()
      return
    }
    setLookup({ status: 'searching' })
    try {
      setLookup({ status: 'found', ...(await searchAssets(text)) })
    } catch (failure) {
      if (endSession(failure)) return
      setLookup({ status: 'failed', message: failure instanceof Error ? failure.message : 'No pudimos buscar.' })
    }
  }

  const choose = (chosen: Asset | null) => {
    justChosen.current = true
    onChange(chosen)
    setLookup({ status: 'idle' })
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
        </div>
      ) : (
        <>
          <TextField
            ref={input}
            id={`${id}-query`}
            label="Activo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter searches; it must not submit the operation that is being filled in.
              if (event.key === 'Enter') {
                event.preventDefault()
                void search()
              }
            }}
            autoComplete="off"
            maxLength={ASSET_QUERY_MAX_LENGTH}
            placeholder="Símbolo o nombre, por ejemplo AAPL"
            errors={errors}
          />
          <button type="button" onClick={() => void search()} className={`${smallSecondaryButtonClassName} mt-2`}>
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
          </div>

          {lookup.status === 'found' && lookup.assets.length > 0 && (
            <ul aria-label="Resultados de la búsqueda" className="mt-2 divide-y divide-line rounded-2xl border border-line">
              {lookup.assets.map((found) => (
                <li key={found.id}>
                  <button
                    type="button"
                    onClick={() => choose(found)}
                    className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[1rem] font-semibold">{found.symbol}</span>
                      <span className="block break-words text-[0.87rem] text-ink-3">{found.name}</span>
                    </span>
                    <span className="shrink-0 text-[0.87rem] text-ink-3">{found.market}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
