import { Flag } from 'lucide-react'
import { useCallback } from 'react'
import type { Account } from '../accounts/api'
import { listStatement, type StatementLine } from '../accounts/statement'
import {
  describeMovement,
  describeOpening,
  isMovement,
  lineLink,
} from '../accounts/statementPresentation'
import { accountsBack } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { OneAccountScreen } from '../components/accounts/OneAccountScreen'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { TradeChip } from '../components/investments/TradeChip'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { Pending, ScreenHeader } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { formatMoney } from '../lib/money'
import { useRecordFeed } from '../lib/useRecordFeed'

const rowId = (line: StatementLine) => `statement-line-${line.id}`

function Chip({ line }: { line: StatementLine }) {
  switch (line.kind) {
    case 'income':
      return <IncomeChip />
    case 'expense':
      return <CategoryChip categoryId={line.categoryId ?? 0} />
    case 'transfer_in':
    case 'transfer_out':
      return <TransferChip />
    case 'buy':
    case 'sell':
    case 'dividend':
      return <TradeChip kind={line.kind} />
    case 'opening':
      return (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <Flag size={19} aria-hidden="true" />
        </span>
      )
  }
}

/** The line that starts the Statement: nothing to edit, because the opening Balance never changes. */
function OpeningRow({ line }: { line: StatementLine }) {
  const { title, details } = describeOpening(line)

  return (
    <li className="-mx-2 flex min-h-[56px] items-center gap-3 px-2 py-3">
      <Chip line={line} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-[1rem] font-medium">{title}</span>
        <span className="mt-0.5 block break-words text-[0.87rem] leading-snug text-ink-3">{details}</span>
      </span>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(line.amount)}</span>
    </li>
  )
}

function Row({ line, accounts }: { line: StatementLine; accounts: Map<number, Account> }) {
  if (!isMovement(line)) return <OpeningRow key={line.id} line={line} />
  const { title, details } = describeMovement(line, accounts)
  const { to, action } = lineLink(line)

  return (
    <RecordRow
      key={line.id}
      id={rowId(line)}
      to={to}
      action={action}
      icon={<Chip line={line} />}
      title={title}
      details={details}
      amount={line.amount}
      signed
    />
  )
}

function Statement({ account }: { account: Account }) {
  const load = useCallback((page: number) => listStatement(account.id, page), [account.id])
  const { state, retry, showMore } = useRecordFeed(load, account.id)
  const accounts = useAccounts()
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const byId = new Map(known.map((item) => [item.id, item]))

  return (
    <>
      <ScreenHeader
        title="Estado de cuenta"
        back={accountsBack}
        intro={
          <>
            {account.name} · Saldo <span className="font-medium tabular-nums">{formatMoney(account.balance)}</span>. Cada
            línea muestra el Saldo después de ella, del movimiento más reciente al más antiguo.
          </>
        }
      />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando el estado de cuenta…" />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(line) => <Row key={line.id} line={line} accounts={byId} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} líneas.`}
        />
      )}
    </>
  )
}

/** The movements of one Account with the Balance after each, to compare with the bank's statement. */
export function AccountStatement() {
  return <OneAccountScreen title="Estado de cuenta">{(account) => <Statement account={account} />}</OneAccountScreen>
}
