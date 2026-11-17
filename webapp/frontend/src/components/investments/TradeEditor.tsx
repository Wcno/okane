import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Asset, Trade, TradeField, TradeInput, TradeKind } from '../../investments/api'
import { cashAmount, commissionAmount, exceedsCash, netCash, type TradeDraft } from '../../investments/form'
import { positionsBack } from '../../investments/presentation'
import { useTradeForm } from '../../investments/useTradeForm'
import { todayInPanama } from '../../lib/dates'
import type { Outcome } from '../../lib/http'
import { typedAmount } from '../../lib/amount'
import { formatMoney } from '../../lib/money'
import { RecordEditor } from '../record/RecordEditor'
import { borderClassName, fieldClassName } from '../record/fieldStyles'
import { FieldError } from '../record/RecordFields'
import { TextField } from '../TextField'
import { AssetPicker } from './AssetPicker'

const copy: Record<TradeKind, { submit: string; submitting: string; cash: string }> = {
  buy: { submit: 'Registrar compra', submitting: 'Registrando…', cash: 'Saldrá de la Cuenta' },
  sell: { submit: 'Registrar venta', submitting: 'Registrando…', cash: 'Volverá a la Cuenta' },
  dividend: { submit: 'Registrar dividendo', submitting: 'Registrando…', cash: 'Entrará en la Cuenta' },
}

/**
 * The form that records or corrects one purchase, sale or Dividend. Buy and Sell differ
 * in the words they use, a Dividend asks for the amount it paid instead of units and price; a correction passes its own labels, its Account note
 * and the content below the buttons.
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
  const { form, draft, change, errors, isSubmitting, submit } = useTradeForm({ kind, initial, accounts, save, onSaved })
  const id = (name: string) => `${kind}-${name}`
  const account = accounts.find((candidate) => candidate.id === draft.accountId)
  const isDividend = kind === 'dividend'
  const grossCash = isDividend ? typedAmount(draft.amount) : cashAmount(draft.units, draft.unitPrice)
  const commission = commissionAmount(draft.commission)
  const cash = grossCash === null ? null : netCash(kind, grossCash, commission)
  const warnAboutCash = exceedsCash(kind, grossCash, account, commission)
  const buttons = labels ?? copy[kind]

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={buttons.submit}
      submittingLabel={buttons.submitting}
      cancelTo={cancelTo}
      stickyActions
      fields={
        <>
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
            {accountNote && <p className="mt-1.5 text-[0.9rem] text-ink-3">{accountNote}</p>}
            <FieldError id={id('account-error')} errors={errors.accountId} />
          </div>

          <AssetPicker id={id('asset')} asset={draft.asset} onChange={(asset) => change({ asset })} errors={errors.assetId} />

          {isDividend ? (
            <TextField
              id={id('amount')}
              label="Importe del dividendo"
              inputMode="decimal"
              autoComplete="off"
              placeholder="12.40"
              value={draft.amount}
              onChange={(event) => change({ amount: event.target.value })}
              errors={errors.amount}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-5 min-[420px]:grid-cols-2 min-[420px]:gap-3">
                <TextField
                  id={id('units')}
                  label="Unidades"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.25"
                  value={draft.units}
                  onChange={(event) => change({ units: event.target.value })}
                  errors={errors.units}
                />
                <TextField
                  id={id('price')}
                  label="Precio por unidad"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="187.35"
                  value={draft.unitPrice}
                  onChange={(event) => change({ unitPrice: event.target.value })}
                  errors={errors.unitPrice}
                />
              </div>
              <TextField
                id={id('commission')}
                label="Comisión (opcional)"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                hint={kind === 'buy' ? 'Se suma al costo de la compra.' : 'Se descuenta de lo que recibes.'}
                value={draft.commission}
                onChange={(event) => change({ commission: event.target.value })}
                errors={errors.commission}
              />
            </>
          )}

          {/* Always in the page, so a screen reader hears the amount and the warning when they appear. */}
          <div aria-live="polite" className="empty:hidden">
            {cash !== null && cash !== '0.00' && (
              <p className="scroll-mb-40 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem]">
                {copy[kind].cash}: <strong className="font-semibold tabular-nums">{formatMoney(cash)}</strong>
              </p>
            )}
            {warnAboutCash && account && (
              <p className="mt-2 flex scroll-mb-40 items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem]">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden="true" />
                Esta compra supera el efectivo de {account.name} ({formatMoney(account.balance)}). Se registra igual y el
                Saldo quedará en negativo.
              </p>
            )}
          </div>

          <TextField
            id={id('date')}
            label="Fecha"
            type="date"
            value={draft.date}
            min={account?.openingDate}
            max={todayInPanama()}
            onChange={(event) => change({ date: event.target.value })}
            errors={errors.date}
          />
        </>
      }
    >
      {children}
    </RecordEditor>
  )
}
