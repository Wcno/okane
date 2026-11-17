import { ArrowLeftRight } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { TradeChip } from '../components/investments/TradeChip'
import { MovementFilters, isEmptyFilter } from '../components/movements/MovementFilters'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { isCalendarDay } from '../lib/dates'
import { noticeFrom } from '../lib/notice'
import { useRecordFeed } from '../lib/useRecordFeed'
import { isMovementType, listMovements, movementKey, type Movement, type MovementFilter } from '../movements/api'
import { describeMovement } from '../movements/presentation'

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

function readFilter(params: URLSearchParams): MovementFilter {
  const type = params.get('type')
  const account = params.get('account')
  return {
    type: isMovementType(type) ? type : null,
    accountId: account !== null && /^[1-9]\d*$/.test(account) ? Number(account) : null,
    from: dayParam(params.get('from')),
    to: dayParam(params.get('to')),
  }
}

function writeFilter(filter: MovementFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.type) params.set('type', filter.type)
  if (filter.accountId !== null) params.set('account', String(filter.accountId))
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  return params
}

const EMPTY_PAGE = { records: [], total: 0, nextPage: null }

/** Every record of the User, whatever its kind, newest first; the filter lives in the address. */
export function Movements() {
  const [params, setParams] = useSearchParams()
  const filter = readFilter(params)
  const filterKey = writeFilter(filter).toString()
  const periodReversed = filter.from !== '' && filter.to !== '' && filter.from > filter.to
  const load = useCallback(
    (page: number) => (periodReversed ? Promise.resolve(EMPTY_PAGE) : listMovements(filter, page)),
    // `filterKey` is every part of `filter` that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, periodReversed],
  )
  const { state, retry, showMore } = useRecordFeed(load, filterKey, movementKey)
  const accounts = useAccounts()
  const notice = noticeFrom(useLocation().state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const byId = new Map(known.map((account) => [account.id, account]))

  return (
    <>
      <ScreenHeader
        title="Movimientos"
        intro="Tus gastos, ingresos, transferencias y operaciones de inversión, del más reciente al más antiguo."
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      <MovementFilters filter={filter} accounts={known} onChange={(next) => setParams(writeFilter(next), { replace: true })} />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus movimientos…" />
      ) : state.value.records.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={isEmptyFilter(filter) ? 'Aún no registras movimientos' : 'Ningún movimiento coincide con estos filtros'}
          text={
            isEmptyFilter(filter)
              ? 'Cuando registres un gasto, un ingreso, una transferencia o una operación de inversión, aparecerá aquí.'
              : 'Prueba con otro tipo, otra Cuenta u otro período.'
          }
          action={{ to: '/expenses/create', label: 'Registrar un gasto' }}
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(movement) => <Row key={movementKey(movement)} movement={movement} accounts={byId} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} movimientos.`}
        />
      )}
    </>
  )
}
