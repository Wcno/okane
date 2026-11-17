import { formatMoney, moneyParts } from '../../lib/money'

/** The dominant figure of a card (`secondary` for a supporting one); a screen reader gets the whole amount as plain text. */
export function BigFigure({ amount, secondary = false }: { amount: string; secondary?: boolean }) {
  const { sign, integer, cents } = moneyParts(amount)
  return (
    <p
      className={`mt-2 font-semibold leading-none tracking-[-0.035em] ${
        secondary ? 'text-[2.2rem] lg:text-[2.6rem]' : 'text-[3.2rem] lg:text-[4.25rem]'
      }`}
    >
      <span className="sr-only">{formatMoney(amount)}</span>
      <span aria-hidden="true">
        {sign}
        <span className="mr-0.5 text-[0.62em] font-medium text-ink-3">$</span>
        {integer}
        <span className="text-[0.5em] font-medium tracking-[-0.01em] text-ink-2">.{cents}</span>
      </span>
    </p>
  )
}
