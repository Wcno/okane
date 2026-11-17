import { Archive, Plus, Wallet } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { accountTypeLabels, accountTypes, formatRate } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { AccountIcon } from '../components/accounts/AccountIcon'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { formatDay } from '../lib/dates'
import { sumAmounts } from '../lib/decimal'
import { formatMoney, moneyParts } from '../lib/money'
import { noticeFrom } from '../lib/notice'

function Row({ account }: { account: Account }) {
  const details = [`Desde ${formatDay(account.openingDate)}`]
  if (account.annualInterestRate !== null) details.push(`Tasa anual ${formatRate(account.annualInterestRate)}`)
  if (account.archivedAt !== null) details.unshift(accountTypeLabels[account.type])

  return (
    <RecordRow
      to={`/accounts/${account.id}/edit`}
      label={`Editar cuenta ${account.name}, ${formatMoney(account.balance)}`}
      icon={<AccountIcon account={account} />}
      title={account.name}
      details={details.join(' · ')}
      amount={account.balance}
    />
  )
}

function Group({ id, title, note, accounts }: { id: string; title: string; note?: string; accounts: Account[] }) {
  return (
    <section aria-labelledby={`${id}-title`} className={cardClassName}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="text-[1rem] font-medium text-ink-2">
          {title}
        </h2>
        <span className="shrink-0 text-[0.95rem] font-semibold tabular-nums text-ink-2">
          {formatMoney(sumAmounts(accounts.map((account) => account.balance)))}
        </span>
      </div>
      {note && <p className="mt-1 max-w-[60ch] text-[0.87rem] text-ink-3">{note}</p>}
      <ul className="mt-3 divide-y divide-line">
        {accounts.map((account) => (
          <Row key={account.id} account={account} />
        ))}
      </ul>
    </section>
  )
}

function Total({ accounts }: { accounts: Account[] }) {
  const total = sumAmounts(accounts.map((account) => account.balance))
  const { sign, integer, cents } = moneyParts(total)
  const archived = accounts.filter((account) => account.archivedAt !== null).length

  return (
    <section aria-labelledby="accounts-total-title" className={cardClassName}>
      <h2 id="accounts-total-title" className="text-[1rem] font-medium text-ink-2">
        Saldo total
      </h2>
      <p
        className="mt-2 text-[3.2rem] font-semibold leading-none tracking-[-0.035em] lg:text-[4.25rem]"
        aria-label={formatMoney(total)}
      >
        <span aria-hidden="true">
          {sign}
          <span className="mr-0.5 text-[0.62em] font-medium text-ink-3">$</span>
          {integer}
          <span className="text-[0.5em] font-medium tracking-[-0.01em] text-ink-2">.{cents}</span>
        </span>
      </p>
      <p className="mt-3.5 max-w-[52ch] text-ink-2">
        {accounts.length === 1 ? 'Es el Saldo de tu única Cuenta.' : `Es la suma de tus ${accounts.length} Cuentas.`}{' '}
        {archived > 0 && 'Incluye las archivadas. '}
        Cada Saldo sale de su Saldo inicial y de lo que registras; no se escribe a mano.
      </p>
      <Link to="/accounts/create" className={`${smallSecondaryButtonClassName} mt-5`}>
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        Crear cuenta
      </Link>
    </section>
  )
}

/** The User's Accounts with their derived Balances, grouped by type. */
export function Accounts() {
  const { state, retry } = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)

  return (
    <>
      <ScreenHeader title="Cuentas" />

      <NoticeBanner notice={notice} />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : state.value.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes Cuentas"
          text="Empieza por la Cuenta que más usas: tu cuenta del banco, tu efectivo o tu tarjeta de crédito. Le pones un nombre, el dinero que tiene hoy y desde cuándo quieres llevar su registro."
          action={{ to: '/accounts/create', label: 'Crear tu primera cuenta' }}
        />
      ) : (
        <AccountGroups accounts={state.value} />
      )}
    </>
  )
}

function AccountGroups({ accounts }: { accounts: Account[] }) {
  const active = accounts.filter((account) => account.archivedAt === null)
  const archived = accounts.filter((account) => account.archivedAt !== null)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="min-w-0 lg:col-span-5">
        <Total accounts={accounts} />
      </div>
      <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
        {accountTypes.map((type) => {
          const ofType = active.filter((account) => account.type === type)
          return (
            ofType.length > 0 && (
              <Group key={type} id={`accounts-${type}`} title={accountTypeLabels[type]} accounts={ofType} />
            )
          )
        })}
        {archived.length > 0 && (
          <Group
            id="accounts-archived"
            title="Archivadas"
            note="Ya no se ofrecen para registrar nada nuevo. Su Saldo y su historial se conservan."
            accounts={archived}
          />
        )}
        {active.length === 0 && (
          <p className="flex items-start gap-2.5 px-1 text-[0.95rem] text-ink-2">
            <Archive size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            Todas tus Cuentas están archivadas. Crea una para registrar algo nuevo.
          </p>
        )}
      </div>
    </div>
  )
}
