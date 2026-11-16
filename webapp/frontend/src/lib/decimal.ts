const AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/** The cents of a decimal string from the API, as an exact integer. */
export function toCents(amount: string): bigint {
  const match = AMOUNT.exec(amount)
  if (!match) throw new Error(`Not a money amount: ${amount}`)
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] && cents !== 0n ? -cents : cents
}

/** Adds decimal strings in whole cents, so 0.10 + 0.20 is 0.30. */
export const sumAmounts = (amounts: string[]) => {
  const total = amounts.reduce((sum, amount) => sum + toCents(amount), 0n)
  const absolute = total < 0n ? -total : total
  return `${total < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

/** A decimal string as the number the money formatters take; for display only. */
export const toDisplayNumber = (amount: string) => Number(toCents(amount)) / 100
