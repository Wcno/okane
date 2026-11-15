const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MINUS = '−'

/** Split an amount into sign, integer part and cents for large number layouts. */
export const moneyParts = (amount: number) => {
  const [integer, cents] = formatter.format(Math.abs(amount)).split('.')
  return { sign: amount < 0 ? MINUS : '', integer, cents }
}

/** Formats $1,284.60 or a negative amount; sign: true also prefixes positive amounts with +. */
export const formatMoney = (amount: number, options: { sign?: boolean } = {}) => {
  const { sign, integer, cents } = moneyParts(amount)
  const prefix = sign || (options.sign && amount > 0 ? '+' : '')
  return `${prefix}$${integer}.${cents}`
}

/** Compact thousands for chart axes, such as $9K and $12K. */
export const formatCompactMoney = (amount: number) => `$${Math.round(amount / 1000)}K`
