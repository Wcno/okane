const AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/** The cents of a decimal string from the API, as an exact integer. */
export function toCents(amount: string): number {
  const match = AMOUNT.exec(amount)
  if (!match) throw new Error(`Not a money amount: ${amount}`)
  const cents = Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'))
  return match[1] && cents !== 0 ? -cents : cents
}

/** Adds decimal strings in whole cents, so 0.10 + 0.20 is 0.30. */
export const sumAmounts = (amounts: string[]) =>
  amounts.reduce((total, amount) => total + toCents(amount), 0) / 100

/** A decimal string as the number the money formatters take; for display only. */
export const toDisplayNumber = (amount: string) => toCents(amount) / 100
