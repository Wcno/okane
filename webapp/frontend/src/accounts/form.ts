import { parseAmount, type ParsedAmount } from '../lib/amount'
import type { AccountChanges, AccountErrors, AccountType, NewAccount } from './api'

/** What the creation form holds while the User types. */
export interface AccountDraft {
  name: string
  type: AccountType | null
  openingBalance: string
  /** A credit card: the amount typed is what the User owes. */
  isDebt: boolean
  openingDate: string
  /** The annual rate as a percentage, the way people say it. */
  annualRatePercent: string
}

export const NAME_MAX_LENGTH = 80

const NAME_REQUIRED = 'Escribe el nombre de la Cuenta, por ejemplo Cuenta corriente.'
const NAME_TOO_LONG = `El nombre admite hasta ${NAME_MAX_LENGTH} caracteres.`
const TYPE_REQUIRED = 'Elige el tipo de Cuenta: gastos, ahorro o inversión.'
const OPENING_BALANCE_TOO_LARGE = 'El Saldo inicial es demasiado grande. El máximo es $999,999,999,999.99.'
const OPENING_BALANCE_INVALID =
  'Escribe el Saldo inicial con dos decimales como máximo, sin separador de miles. Ejemplo: 1250.00'
const OPENING_DATE_REQUIRED = 'Elige la fecha desde la que llevarás el registro de esta Cuenta.'
const OPENING_DATE_IN_FUTURE = 'La fecha de inicio no puede ser futura. Elige hoy o un día anterior.'
const RATE_INVALID = 'Escribe la tasa anual como un porcentaje de cero o más. Ejemplo: 4.25'

const PERCENT = /^(\d{1,5})(?:\.(\d{1,4}))?$/
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/

const withoutLeadingZeros = (digits: string) => digits.replace(/^0+(?=\d)/, '')

/** The opening balance as the decimal string the API takes; a debt is stored negative. */
export function parseOpeningBalance(text: string, isDebt: boolean): ParsedAmount {
  const parsed = parseAmount(text)
  if ('error' in parsed || !isDebt || parsed.amount.startsWith('-') || parsed.amount === '0.00') return parsed
  return { amount: `-${parsed.amount}` }
}

/** 4.25 (percent) as the exact ratio 0.0425; digits move, nothing is multiplied. */
export function percentToRatio(text: string): string | null {
  const match = PERCENT.exec(text.trim().replace(',', '.'))
  if (!match) return null
  const whole = match[1].padStart(3, '0')
  return `${withoutLeadingZeros(whole.slice(0, -2))}.${whole.slice(-2)}${match[2] ?? ''}`
}

/** The stored ratio 0.042500 as the percentage 4.25. */
export function ratioToPercent(ratio: string): string {
  const [whole, fraction = ''] = ratio.split('.')
  const padded = fraction.padEnd(2, '0')
  const percent = `${withoutLeadingZeros(whole + padded.slice(0, 2))}.${padded.slice(2)}`
  return percent.replace(/\.?0*$/, '')
}

function nameErrors(name: string): string[] | undefined {
  if (name === '') return [NAME_REQUIRED]
  if (name.length > NAME_MAX_LENGTH) return [NAME_TOO_LONG]
  return undefined
}

export type NewAccountOutcome = { ok: true; account: NewAccount } | { ok: false; errors: AccountErrors }

/** Checks what the browser can know before sending; api-service has the last word. */
export function validateNewAccount(draft: AccountDraft, today: string): NewAccountOutcome {
  const errors: AccountErrors = {}
  const name = draft.name.trim()
  const isSavings = draft.type === 'savings'
  const openingBalance = parseOpeningBalance(draft.openingBalance, draft.isDebt && draft.type === 'spending')
  const rateText = draft.annualRatePercent.trim()
  const annualInterestRate = isSavings && rateText !== '' ? percentToRatio(rateText) : null

  const invalidName = nameErrors(name)
  if (invalidName) errors.name = invalidName
  if (draft.type === null) errors.type = [TYPE_REQUIRED]
  if ('error' in openingBalance) {
    errors.openingBalance = [openingBalance.error === 'too-large' ? OPENING_BALANCE_TOO_LARGE : OPENING_BALANCE_INVALID]
  }
  if (!CALENDAR_DAY.test(draft.openingDate)) errors.openingDate = [OPENING_DATE_REQUIRED]
  else if (draft.openingDate > today) errors.openingDate = [OPENING_DATE_IN_FUTURE]
  if (isSavings && rateText !== '' && annualInterestRate === null) errors.annualInterestRate = [RATE_INVALID]

  if (Object.keys(errors).length > 0 || draft.type === null || 'error' in openingBalance) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    account: { name, type: draft.type, openingBalance: openingBalance.amount, openingDate: draft.openingDate, annualInterestRate },
  }
}

export type AccountChangesOutcome = { ok: true; changes: AccountChanges } | { ok: false; errors: AccountErrors }

export function validateAccountChanges(
  draft: Pick<AccountDraft, 'name' | 'annualRatePercent'>,
  type: AccountType,
): AccountChangesOutcome {
  const name = draft.name.trim()
  const invalidName = nameErrors(name)
  if (invalidName) return { ok: false, errors: { name: invalidName } }
  if (type !== 'savings') return { ok: true, changes: { name } }

  const rateText = draft.annualRatePercent.trim()
  if (rateText === '') return { ok: true, changes: { name, annualInterestRate: null } }
  const annualInterestRate = percentToRatio(rateText)
  if (annualInterestRate === null) return { ok: false, errors: { annualInterestRate: [RATE_INVALID] } }
  return { ok: true, changes: { name, annualInterestRate } }
}
