import type { ReactNode } from 'react'
import { isOffered, useCatalog } from '../../categories/catalog'
import { CategoryChip } from '../expenses/CategoryChip'
import { FieldError } from './RecordFields'

/**
 * The two-column picker of the User's Categories, for every form that names one
 * (an Expense, a RecurringPayment). `hint` sits right under it, where the
 * consequence of the choice is shown.
 */
export function CategoryField({
  idPrefix,
  draft,
  onChange,
  errors,
  hint,
}: {
  idPrefix: string
  draft: { categoryId: number | null }
  onChange: (patch: { categoryId: number }) => void
  errors: { categoryId?: string[] }
  hint?: ReactNode
}) {
  const id = (name: string) => `${idPrefix}-${name}`
  // An archived Category stays in the picker only while a record being corrected still holds it.
  const options = useCatalog().filter((option) => isOffered(option) || option.id === draft.categoryId)

  return (
    <fieldset aria-describedby={errors.categoryId ? id('category-error') : undefined}>
      <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const selected = draft.categoryId === option.id
          return (
            <label
              key={option.id}
              className={`flex min-w-0 cursor-pointer flex-col items-start gap-1.5 rounded-2xl border p-2 transition-colors sm:flex-row sm:items-center sm:gap-2 sm:p-1.5 sm:pr-2 duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name={id('category')}
                value={option.id}
                checked={selected}
                onChange={() => onChange({ categoryId: option.id })}
                aria-invalid={Boolean(errors.categoryId)}
                className="sr-only"
              />
              <CategoryChip categoryId={option.id} size={36} />
              <span
                className={`min-w-0 text-[0.9rem] leading-tight ${selected ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}
              >
                {option.name}
              </span>
            </label>
          )
        })}
      </div>
      <FieldError id={id('category-error')} errors={errors.categoryId} />
      {/* Always in the page, so a screen reader hears the hint when it appears; empty, it takes no room. */}
      <div aria-live="polite">{hint}</div>
    </fieldset>
  )
}
