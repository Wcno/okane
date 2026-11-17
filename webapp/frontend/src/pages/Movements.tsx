import { Coins } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { offeredAccounts } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { TradeChip } from '../components/investments/TradeChip'
import { MovementFilters } from '../components/movements/MovementFilters'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { isCalendarDay } from '../lib/dates'
import { noticeFrom } from '../lib/notice'
import { useRecordFeed } from '../lib/useRecordFeed'
import { NEEDS_AN_ACCOUNT_FOR_EXPENSE } from '../expenses/presentation'
import { NEEDS_AN_ACCOUNT_FOR_INCOME } from '../incomes/presentation'
import {
  isMovementType,
  listMovements,
  movementKey,
  type Movement,
  type MovementFilter,
  type MovementType,
} from '../movements/api'
import { describeMovement } from '../movements/presentation'
import { useMovementsRevision } from '../movements/revision'
import { movementViews, sameTypes, type MovementViewName } from '../movements/views'
import { NEEDS_TWO_ACCOUNTS, transferAccounts } from '../transfers/presentation'

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

function readFilter(params: URLSearchParams, preset: MovementType[]): MovementFilter {
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

const EMPTY_PAGE = { records: [], total: 0, nextPage: null }

interface Create {
  to: string
  label: string
  shortLabel?: string
}

interface CanRegister {
  money: boolean
  transfer: boolean
}

/** What each address offers to register: its own kind of record, or every kind from the general view. */
function creates(view: MovementViewName, can: CanRegister) {
  const expense: Create = { to: '/expenses/create', label: 'Registrar gasto', shortLabel: 'Gasto' }
  const income: Create = { to: '/incomes/create', label: 'Registrar ingreso', shortLabel: 'Ingreso' }
  const transfer: Create = { to: '/transfers/create', label: 'Registrar transferencia', shortLabel: 'Nueva' }
  const purchase: Create = { to: '/investments/transactions/buy', label: 'Registrar compra', shortLabel: 'Comprar' }
  const dividend: Create = { to: '/investments/transactions/dividend', label: 'Registrar dividendo' }
  switch (view) {
    case 'expense':
      return { primary: can.money ? expense : undefined, others: [] }
    case 'income':
      return { primary: can.money ? income : undefined, others: [] }
    case 'transfer':
      return { primary: can.transfer ? transfer : undefined, others: [] }
    case 'investments':
      return { primary: purchase, others: [dividend] }
    default:
      return {
        primary: can.money ? expense : undefined,
        others: [...(can.money ? [income] : []), ...(can.transfer ? [transfer] : []), purchase, dividend],
      }
  }
}

/** What an address with nothing registered asks for first: a record, or the Account it needs. */
function firstRecord(view: MovementViewName, can: CanRegister): { to: string; label: string; note?: string } {
  const accountFirst = { to: '/accounts/create', label: 'Crear tu primera cuenta' }
  switch (view) {
    case 'expense':
      return can.money
        ? { to: '/expenses/create', label: 'Registrar tu primer gasto' }
        : { ...accountFirst, note: NEEDS_AN_ACCOUNT_FOR_EXPENSE }
    case 'income':
      return can.money
        ? { to: '/incomes/create', label: 'Registrar tu primer ingreso' }
        : { ...accountFirst, note: NEEDS_AN_ACCOUNT_FOR_INCOME }
    case 'transfer':
      return can.transfer
        ? { to: '/transfers/create', label: 'Registrar tu primera transferencia' }
        : { to: '/accounts/create', label: 'Crear una cuenta', note: NEEDS_TWO_ACCOUNTS }
    case 'investments':
      return { to: '/investments/transactions/buy', label: 'Registrar tu primera compra' }
    default:
      return can.money ? { to: '/expenses/create', label: 'Registrar un gasto' } : accountFirst
  }
}

/**
 * Every record of the User, whatever its kind, newest first. `/movements` shows
 * them all; the older route of each kind shows the same screen with its type
 * chosen. The filter lives in the address.
 */
export function Movements({ view = 'all' }: { view?: MovementViewName }) {
  const preset = movementViews[view]
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const filter = readFilter(params, preset.types)
  const filterKey = writeFilter(filter).toString()
  const periodReversed = filter.from !== '' && filter.to !== '' && filter.from > filter.to
  const load = useCallback(
    (page: number) => (periodReversed ? Promise.resolve(EMPTY_PAGE) : listMovements(filter, page)),
    // `filterKey` is every part of `filter` that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, periodReversed],
  )
  const revision = useMovementsRevision()
  const { state, retry, showMore } = useRecordFeed(load, `${filterKey}#${revision}`, movementKey)
  const accounts = useAccounts()
  const notice = noticeFrom(useLocation().state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const byId = new Map(known.map((account) => [account.id, account]))
  const loading = accounts.state.status !== 'ready'
  const can = {
    money: loading || offeredAccounts(known).length > 0,
    transfer: loading || transferAccounts(known).length >= 2,
  }
  const { primary, others } = creates(view, can)
  const hasRecords = state.status === 'ready' && state.value.records.length > 0
  const atRest =
    sameTypes(filter.types, preset.types) && filter.accountId === null && filter.from === '' && filter.to === ''
  const first = firstRecord(view, can)
  // With nothing registered, the empty state already asks for the first record.
  const headerAction = view === 'all' || view === 'expense' || view === 'income' || hasRecords ? primary : undefined

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
          title={atRest ? preset.empty.title : 'Ningún movimiento coincide con estos filtros'}
          text={atRest ? (first.note ?? preset.empty.text) : 'Prueba con otro tipo, otra Cuenta u otro período.'}
          action={{ to: first.to, label: first.label }}
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(movement) => <Row key={movementKey(movement)} movement={movement} accounts={byId} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} ${preset.noun}.`}
        />
      )}
    </>
  )
}
