/** The most integer digits a money field takes; api-service holds 14 digits with two decimals. */
export const MAX_INTEGER_DIGITS = 12

export type ParsedAmount = { amount: string } | { error: 'invalid' | 'too-large' }

const MINUS_SIGNS = /^[-−]/
const AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/**
 * An amount typed by the User as the decimal string the API takes: two
 * decimals, a comma or a point as separator, a leading minus. Never a negative zero.
 */
export function parseAmount(text: string): ParsedAmount {
  const match = AMOUNT.exec(text.trim().replace(MINUS_SIGNS, '-').replace(',', '.'))
  if (!match) return { error: 'invalid' }
  const integer = match[2].replace(/^0+(?=\d)/, '')
  if (integer.length > MAX_INTEGER_DIGITS) return { error: 'too-large' }
  const amount = `${integer}.${(match[3] ?? '').padEnd(2, '0')}`
  return { amount: match[1] && amount !== '0.00' ? `-${amount}` : amount }
}
