import type { Account } from '../accounts/api'
import { MAX_QUANTITY_DECIMALS, parseQuantity, type ParsedQuantity } from '../lib/amount'
import { formatDay, isCalendarDay, todayInPanama } from '../lib/dates'
import { toCents } from '../lib/decimal'
import type { Asset, TradeErrors, TradeInput, TradeKind } from './api'

/** What the form holds while the User types. */
export interface TradeDraft {
  accountId: number | null
  asset: Asset | null
  units: string
  unitPrice: string
  date: string
}

const UNITS_INVALID = `Escribe las unidades mayores que cero, con ${MAX_QUANTITY_DECIMALS} decimales como máximo. Ejemplo: 0.25`
const UNITS_TOO_LARGE = 'Las unidades son demasiado grandes. El máximo es 999,999,999,999.'
const PRICE_INVALID = `Escribe el precio por unidad mayor que cero, con ${MAX_QUANTITY_DECIMALS} decimales como máximo. Ejemplo: 187.35`
const PRICE_TOO_LARGE = 'El precio por unidad es demasiado grande. El máximo es $999,999,999,999.'
const ACCOUNT_REQUIRED = 'Elige la Cuenta de inversión de la operación.'
const ASSET_REQUIRED = 'Busca el Activo y elígelo de la lista.'
const DATE_INVALID = 'Elige la fecha de la operación.'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'
const CASH_TOO_SMALL = 'Con estas unidades y este precio el importe es menor que un centavo. Sube las unidades o el precio.'

const SCALE = 10n ** BigInt(MAX_QUANTITY_DECIMALS)

/** A parsed quantity as an exact integer of hundred-millionths. */
function scaled(quantity: string): bigint {
  const [whole, fraction = ''] = quantity.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(MAX_QUANTITY_DECIMALS, '0'))
}

/**
 * The cash of an operation as a money string: units times price, rounded to
 * cents with halves away from zero, as api-service rounds it. Null while
 * either field is not a quantity.
 */
export function cashAmount(units: string, unitPrice: string): string | null {
  const parsedUnits = parseQuantity(units)
  const parsedPrice = parseQuantity(unitPrice)
  if ('error' in parsedUnits || 'error' in parsedPrice) return null
  const product = scaled(parsedUnits.quantity) * scaled(parsedPrice.quantity)
  const cents = (product + (SCALE * SCALE) / 200n) / ((SCALE * SCALE) / 100n)
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

/** Whether a purchase takes more cash than the Account holds; it is accepted anyway, with a warning. */
export function exceedsCash(kind: TradeKind, cash: string | null, account: Account | undefined): boolean {
  return kind === 'buy' && cash !== null && account !== undefined && toCents(cash) > toCents(account.balance)
}

const quantityMessage = (parsed: ParsedQuantity, invalid: string, tooLarge: string) =>
  'error' in parsed ? [parsed.error === 'too-large' ? tooLarge : invalid] : undefined

export type TradeOutcome = { ok: true; trade: TradeInput; asset: Asset } | { ok: false; errors: TradeErrors }

/**
 * Checks what the browser can know before sending; api-service has the last
 * word, including whether the Position holds the units to sell. "Today" is the
 * Panama day at the moment of the check.
 */
export function validateTrade(draft: TradeDraft, context: { accounts: Account[] }): TradeOutcome {
  const errors: TradeErrors = {}
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)
  const units = parseQuantity(draft.units)
  const unitPrice = parseQuantity(draft.unitPrice)
  const today = todayInPanama()

  if (account === undefined) errors.accountId = [ACCOUNT_REQUIRED]
  if (draft.asset === null) errors.assetId = [ASSET_REQUIRED]
  const unitsError = quantityMessage(units, UNITS_INVALID, UNITS_TOO_LARGE)
  if (unitsError) errors.units = unitsError
  const priceError = quantityMessage(unitPrice, PRICE_INVALID, PRICE_TOO_LARGE)
  if (priceError) errors.unitPrice = priceError
  if (!errors.units && !errors.unitPrice && cashAmount(draft.units, draft.unitPrice) === '0.00') {
    errors.units = [CASH_TOO_SMALL]
  }
  if (!isCalendarDay(draft.date)) errors.date = [DATE_INVALID]
  else if (draft.date > today) errors.date = [DATE_IN_FUTURE]
  else if (account !== undefined && draft.date < account.openingDate) {
    errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta (${formatDay(account.openingDate)}).`]
  }

  if (
    Object.keys(errors).length > 0 ||
    account === undefined ||
    draft.asset === null ||
    'error' in units ||
    'error' in unitPrice
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    asset: draft.asset,
    trade: {
      accountId: account.id,
      assetId: draft.asset.id,
      units: units.quantity,
      unitPrice: unitPrice.quantity,
      date: draft.date,
    },
  }
}

/**
 * Accounts that take purchases and sales: investment ones that are not archived.
 * `keep` stays even if archived: a correction keeps the Account it already has.
 */
export const tradingAccounts = (accounts: Account[], keep?: number) =>
  accounts.filter(
    (account) => account.id === keep || (account.type === 'investment' && account.archivedAt === null),
  )
