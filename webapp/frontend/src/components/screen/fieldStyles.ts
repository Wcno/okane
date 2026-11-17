/** The 44px box of a text, date or select field (DESIGN.md, Fields). */
export const fieldClassName =
  'h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

export const borderClassName = (invalid: boolean) =>
  invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'
