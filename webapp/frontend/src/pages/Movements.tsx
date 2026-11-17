import { Coins } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { offeredAccounts } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { TradeChip } from '../components/investments/TradeChip'
import { MovementFilters } from '../components/movements/MovementFilters'
import { DayFeed, type FeedGroup } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { isCalendarDay, todayInPanama } from '../lib/dates'
import { noticeFrom } from '../lib/notice'
import { useRecordFeed } from '../lib/useRecordFeed'
import {
  MOVEMENT_TYPES,
  isMovementType,
  listMovements,
  movementKey,
  type Movement,
  type MovementFilter,
  type MovementType,
} from '../movements/api'
import { describeMovement, movementTypeFilterNames } from '../movements/presentation'
import { useMovementsRevision } from '../movements/revision'
import { movementViews, sameTypes, type Create, type MovementViewName, type Need } from '../movements/views'
import { INITIAL_PREFERENCES, movementFilterOf, type Preferences } from '../preferences/api'
import { usePreferences } from '../preferences/usePreferences'
import { transferAccounts } from '../transfers/presentation'

const rowId = (movement: Movement) => `movement-${movementKey(movement)}`

function Chip({ movement }: { movement: Movement }) {
  switch (movement.type) {
    case 'expense':
      return <CategoryChip categoryId={movement.record.categoryId} />
    case 'income':
      return <IncomeChip />
    case 'transfer':
      return <TransferChip />
    default:
      return <TradeChip kind={movement.type} />
  }
}

function Row({ movement, accounts }: { movement: Movement; accounts: Map<number, Account> }) {
  const { title, details, amount, to, action } = describeMovement(movement, accounts)
  return (
    <RecordRow
      id={rowId(movement)}
      to={to}
      action={action}
      icon={<Chip movement={movement} />}
      title={title}
      details={details}
      amount={amount}
    />
  )
}

const dayParam = (text: string | null) => (text !== null && isCalendarDay(text) ? text : '')

function readFilter(search: string, preset: MovementType[]): MovementFilter {
  const params = new URLSearchParams(search)
  const account = params.get('account')
  const named = params.getAll('type').filter(isMovementType)
  return {
    types: named.length > 0 ? named : preset,
    accountId: account !== null && /^[1-9]\d*$/.test(account) ? Number(account) : null,
    from: dayParam(params.get('from')),
    to: dayParam(params.get('to')),
  }
}

function writeFilter(filter: MovementFilter): URLSearchParams {
  const params = new URLSearchParams()
  for (const type of filter.types) params.append('type', type)
  if (filter.accountId !== null) params.set('account', String(filter.accountId))
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  return params
}

const isReversed = (filter: MovementFilter) => filter.from !== '' && filter.to !== '' && filter.from > filter.to

const EMPTY_PAGE = { records: [], total: 0, nextPage: null }

const FILTER_PARAMS = ['type', 'account', 'from', 'to']

/** The records split under one heading per type, in the order the filter lists the types. */
function groupByType(movements: Movement[]): FeedGroup<Movement>[] {
  return MOVEMENT_TYPES.map((type) => ({
    key: `type-${type}`,
    heading: movementTypeFilterNames[type],
    records: movements.filter((movement) => movement.type === type),
  })).filter((group) => group.records.length > 0)
}

/**
 * Every record of the User, whatever its kind, newest first. `/movements` shows
 * them all, starting from the User's preferences; the older route of each kind
 * shows the same screen with its type chosen. The filter lives in the address.
 */
function MovementsView({ view, preferences }: { view: MovementViewName; preferences: Preferences | null }) {
  const preset = movementViews[view]
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const search = params.toString()
  // An address that names a filter prevails over the preferences, which never reach the routes of one kind.
  const hasAddressFilter = FILTER_PARAMS.some((name) => params.has(name))
  const today = todayInPanama()
  const filter = useMemo(() => {
    if (hasAddressFilter || preferences === null) return readFilter(search, preset.types)
    return movementFilterOf(preferences, today)
  }, [search, preset, hasAddressFilter, preferences, today])
  const load = useCallback(
    (page: number) => (isReversed(filter) ? Promise.resolve(EMPTY_PAGE) : listMovements(filter, page)),
    [filter],
  )
  const revision = useMovementsRevision()
  const { state, retry, showMore } = useRecordFeed(load, `${search}#${revision}`, movementKey)
  const accounts = useAccounts()
  const notice = noticeFrom(useLocation().state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const byId = new Map(known.map((account) => [account.id, account]))
  const loading = accounts.state.status !== 'ready'
  const can: Record<Need, boolean> = {
    money: loading || offeredAccounts(known).length > 0,
    transfers: loading || transferAccounts(known).length >= 2,
  }
  const allowed = (create: Create) => create.needs === undefined || can[create.needs]
  const hasRecords = state.status === 'ready' && state.value.records.length > 0
  const atRest = !hasAddressFilter
  const startsFromPreferences = preferences !== null && atRest && preferences.period !== 'all'
  const onlyThisMonth =
    preferences !== null &&
    preferences.period === 'current_month' &&
    preferences.accountId === null &&
    preferences.movementType === null
  const first = allowed(preset.first.create)
    ? preset.first.create
    : (preset.first.withoutAccount ?? preset.first.create)
  const note = 'note' in first ? first.note : undefined
  // With nothing registered, the empty state already asks for the first record.
  const headerAction = preset.create && allowed(preset.create) && hasRecords ? preset.create : undefined
  const others = preset.others.filter(allowed)

  const change = (next: MovementFilter) => {
    // Another type is another screen: the older routes only open their own kind.
    if (view !== 'all' && !sameTypes(next.types, preset.types)) {
      navigate(`/movements?${writeFilter(next)}`, { replace: true })
    } else {
      setParams(writeFilter({ ...next, types: view === 'all' ? next.types : [] }), { replace: true })
    }
  }

  return (
    <>
      <ScreenHeader title={preset.title} intro={preset.intro} action={headerAction} />

      {others.length > 0 && (hasRecords || view === 'all') && (
        <div className="mb-5 flex flex-wrap gap-2.5 lg:mb-6">
          {others.map((create) => (
            <Link key={create.to} to={create.to} className={smallSecondaryButtonClassName}>
              {create.to.endsWith('/dividend') && <Coins size={17} aria-hidden="true" />}
              {create.label}
            </Link>
          ))}
        </div>
      )}

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      <MovementFilters
        filter={filter}
        accounts={known}
        canClear={!atRest}
        onChange={change}
        onClear={() => setParams({}, { replace: true })}
      />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading={preset.loading} />
      ) : state.value.records.length === 0 ? (
        <EmptyState
          icon={preset.icon}
          title={
            startsFromPreferences
              ? onlyThisMonth
                ? 'Aún no hay movimientos este mes'
                : 'Ningún movimiento coincide con tus preferencias'
              : atRest
                ? preset.empty.title
                : 'Ningún movimiento coincide con estos filtros'
          }
          text={
            startsFromPreferences
              ? 'Tu vista empieza con tus preferencias. Cambia los filtros aquí o en Preferencias para ver otros movimientos.'
              : atRest
                ? (note ?? preset.empty.text)
                : 'Prueba con otro tipo, otra Cuenta u otro período.'
          }
          action={{ to: first.to, label: first.label }}
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(movement) => <Row key={movementKey(movement)} movement={movement} accounts={byId} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} ${preset.noun}.`}
          groupBy={preferences?.grouping === 'type' ? groupByType : undefined}
        />
      )}
    </>
  )
}

/** The main screen waits for the preferences it starts from, but never depends on them. */
function MovementsWithPreferences() {
  const { state, retry } = usePreferences()
  if (state.status === 'loading') return <Pending state={state} retry={retry} loading="Cargando tus movimientos…" />
  return <MovementsView view="all" preferences={state.status === 'ready' ? state.value : INITIAL_PREFERENCES} />
}

export function Movements({ view = 'all' }: { view?: MovementViewName }) {
  return view === 'all' ? <MovementsWithPreferences /> : <MovementsView view={view} preferences={null} />
}
