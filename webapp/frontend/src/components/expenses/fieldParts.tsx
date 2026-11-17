import type { ReactNode, Ref } from 'react'
import { categories } from '../../data/categories'
import { CategoryChip } from './CategoryChip'

export const fieldClassName =
  'h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

export const borderClassName = (invalid: boolean) =>
  invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null
  return (
    <p id={id} className="mt-1.5 text-[0.9rem] text-critical">
      {errors.join(' ')}
    </p>
  )
}

/** The big money input every form of an amount shares; `id` builds the ids of its parts. */
export function AmountField({
  id,
  value,
  onChange,
  errors,
  inputRef,
}: {
  id: (name: string) => string
  value: string
  onChange: (value: string) => void
  errors?: string[]
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div>
      <label htmlFor={id('amount')} className="text-[0.9rem] font-medium text-ink-2">
        Monto
      </label>
      <div
        className={`mt-1.5 flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-2.5 transition-colors duration-150 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15 ${
          errors ? 'border-critical' : 'border-line-strong hover:border-ink-3'
        }`}
      >
        <span className="text-[1.6rem] font-semibold text-ink-3" aria-hidden="true">
          $
        </span>
        <input
          ref={inputRef}
          id={id('amount')}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(errors)}
          aria-describedby={errors ? id('amount-error') : undefined}
          className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
        />
      </div>
      <FieldError id={id('amount-error')} errors={errors} />
    </div>
  )
}

/** The two-column picker of the fixed Categories. `hint` sits right under it. */
export function CategoryPicker({
  id,
  value,
  onChange,
  errors,
  hint,
}: {
  id: (name: string) => string
  value: number | null
  onChange: (categoryId: number) => void
  errors?: string[]
  hint?: ReactNode
}) {
  return (
    <fieldset aria-describedby={errors ? id('category-error') : undefined}>
      <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {categories.map((option) => {
          const selected = value === option.id
          return (
            <label
              key={option.id}
              className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border p-1.5 pr-2 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name={id('category')}
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                aria-invalid={Boolean(errors)}
                className="sr-only"
              />
              <CategoryChip categoryId={option.id} size={36} />
              <span
                className={`min-w-0 break-words text-[0.9rem] leading-tight ${selected ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}
              >
                {option.name}
              </span>
            </label>
          )
        })}
      </div>
      <FieldError id={id('category-error')} errors={errors} />
      {/* Always in the page, so a screen reader hears the hint when it appears; empty, it takes no room. */}
      <div aria-live="polite">{hint}</div>
    </fieldset>
  )
}
