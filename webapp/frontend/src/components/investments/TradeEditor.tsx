import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import type { Asset, Trade, TradeField, TradeInput, TradeKind } from '../../investments/api'
import { cashAmount, exceedsCash, type TradeDraft } from '../../investments/form'
import { positionsBack } from '../../investments/presentation'
import { useTradeForm } from '../../investments/useTradeForm'
import { todayInPanama } from '../../lib/dates'
import type { Outcome } from '../../lib/http'
import { formatMoney } from '../../lib/money'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'
import { AssetPicker } from './AssetPicker'

const fieldClassName =
  'h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

const borderClassName = (invalid: boolean) =>
  invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null
  return (
    <p id={id} className="mt-1.5 text-[0.9rem] text-critical">
      {errors.join(' ')}
    </p>
  )
}

const copy: Record<TradeKind, { submit: string; submitting: string; cash: string }> = {
  buy: { submit: 'Registrar compra', submitting: 'Registrando…', cash: 'Saldrá de la Cuenta' },
  sell: { submit: 'Registrar venta', submitting: 'Registrando…', cash: 'Volverá a la Cuenta' },
}

/**
 * The card with the form that records or corrects one purchase or sale. Buy and
 * Sell differ in the words they use; a correction passes its own labels, its
 * Account note and the way out of the card.
 */
export function TradeEditor({
  kind,
  initial,
  accounts,
  save,
  onSaved,
  labels,
  cancelTo = positionsBack.to,
  accountNote,
  children,
}: {
  kind: TradeKind
  initial: TradeDraft
  accounts: Account[]
  save: (trade: TradeInput) => Promise<Outcome<Trade, TradeField>>
  onSaved: (trade: Trade, asset: Asset) => void | Promise<void>
  labels?: { submit: string; submitting: string }
  cancelTo?: string
  accountNote?: string
  /** Content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useTradeForm({ initial, accounts, save, onSaved })
  const id = (name: string) => `${kind}-${name}`
  const account = accounts.find((candidate) => candidate.id === draft.accountId)
  const cash = cashAmount(draft.units, draft.unitPrice)
  const warnAboutCash = exceedsCash(kind, cash, account)
  const buttons = labels ?? copy[kind]

  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={form} onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <div>
          <label htmlFor={id('account')} className="text-[0.9rem] font-medium text-ink-2">
            Cuenta de inversión
          </label>
          <select
            id={id('account')}
            value={draft.accountId ?? ''}
            onChange={(event) => change({ accountId: Number(event.target.value) })}
            aria-invalid={Boolean(errors.accountId)}
            aria-describedby={errors.accountId ? id('account-error') : undefined}
            className={`${fieldClassName} ${borderClassName(Boolean(errors.accountId))} mt-1.5`}
          >
            {accounts.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {formatMoney(option.balance)}
              </option>
            ))}
          </select>
          <FieldError id={id('account-error')} errors={errors.accountId} />
          {accountNote && <p className="mt-1.5 text-[0.9rem] text-ink-3">{accountNote}</p>}
        </div>

        <AssetPicker id={id('asset')} asset={draft.asset} onChange={(asset) => change({ asset })} error={errors.assetId} />

        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 min-[420px]:gap-3">
          <div className="min-w-0">
            <label htmlFor={id('units')} className="text-[0.9rem] font-medium text-ink-2">
              Unidades
            </label>
            <input
              id={id('units')}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.25"
              value={draft.units}
              onChange={(event) => change({ units: event.target.value })}
              aria-invalid={Boolean(errors.units)}
              aria-describedby={errors.units ? id('units-error') : undefined}
              className={`${fieldClassName} ${borderClassName(Boolean(errors.units))} mt-1.5`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={id('price')} className="text-[0.9rem] font-medium text-ink-2">
              Precio por unidad
            </label>
            <input
              id={id('price')}
              inputMode="decimal"
              autoComplete="off"
              placeholder="187.35"
              value={draft.unitPrice}
              onChange={(event) => change({ unitPrice: event.target.value })}
              aria-invalid={Boolean(errors.unitPrice)}
              aria-describedby={errors.unitPrice ? id('price-error') : undefined}
              className={`${fieldClassName} ${borderClassName(Boolean(errors.unitPrice))} mt-1.5`}
            />
          </div>
        </div>
        <FieldError id={id('units-error')} errors={errors.units} />
        <FieldError id={id('price-error')} errors={errors.unitPrice} />

        {/* Always in the page, so a screen reader hears the amount and the warning when they appear. */}
        <div aria-live="polite" className="empty:hidden">
          {cash !== null && cash !== '0.00' && (
            <p className="rounded-2xl bg-surface-2 p-3.5 text-[0.95rem]">
              {copy[kind].cash}: <strong className="font-semibold tabular-nums">{formatMoney(cash)}</strong>
            </p>
          )}
          {warnAboutCash && account && (
            <p className="mt-2 flex items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem]">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden="true" />
              Esta compra supera el efectivo de {account.name} ({formatMoney(account.balance)}). Se registra igual y el
              Saldo quedará en negativo.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={id('date')} className="text-[0.9rem] font-medium text-ink-2">
            Fecha
          </label>
          <input
            id={id('date')}
            type="date"
            value={draft.date}
            min={account?.openingDate}
            max={todayInPanama()}
            onChange={(event) => change({ date: event.target.value })}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? id('date-error') : undefined}
            className={`${fieldClassName} ${borderClassName(Boolean(errors.date))} mt-1.5`}
          />
          <FieldError id={id('date-error')} errors={errors.date} />
        </div>

        {/* On a phone the action row stays above the bottom bar however long the form is. */}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-5 -mb-5 flex flex-col-reverse gap-3 border-t border-line bg-surface px-5 pb-4 pt-3 sm:flex-row lg:static lg:mx-0 lg:mb-0 lg:border-0 lg:p-0 lg:pt-1">
          <Link to={cancelTo} className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? buttons.submitting : buttons.submit}
          </button>
        </div>
      </form>
      {children}
    </section>
  )
}
