import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Budget, BudgetErrors, BudgetField, BudgetInput } from '../../budgets/api'
import { validateBudget, type BudgetDraft } from '../../budgets/form'
import { categories } from '../../data/categories'
import type { Outcome } from '../../lib/http'
import { useFieldErrors } from '../../lib/useFieldErrors'
import { useSubmission } from '../../lib/useSubmission'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'
import { TextField } from '../TextField'

const selectClassName = (invalid: boolean) =>
  `mt-1.5 h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
    invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'
  }`

/** The card with the form that creates or corrects one Budget; Create and Edit differ in what they pass. */
export function BudgetEditor({
  initial,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  cancelTo,
  children,
}: {
  initial: BudgetDraft
  save: (budget: BudgetInput) => Promise<Outcome<Budget, BudgetField>>
  onSaved: (budget: Budget) => void
  submitLabel: string
  submittingLabel: string
  cancelTo: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<BudgetField>()
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: BudgetErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<BudgetDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...(Object.keys(patch) as BudgetField[]))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateBudget(draft)
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(() => save(checked.budget), onSaved)
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={form} onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <div>
          <label htmlFor="budget-category" className="text-[0.9rem] font-medium text-ink-2">
            Categoría
          </label>
          <select
            id="budget-category"
            value={draft.categoryId ?? ''}
            onChange={(event) => change({ categoryId: event.target.value === '' ? null : Number(event.target.value) })}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'budget-category-error' : undefined}
            className={selectClassName(Boolean(errors.categoryId))}
          >
            <option value="">Elige una Categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p id="budget-category-error" className="mt-1.5 text-[0.9rem] text-critical">
              {errors.categoryId.join(' ')}
            </p>
          )}
        </div>

        <TextField
          id="budget-month"
          label="Mes"
          type="month"
          value={draft.month}
          onChange={(event) => change({ month: event.target.value })}
          errors={errors.month}
        />

        <TextField
          id="budget-amount"
          label="Monto del Presupuesto"
          hint="Lo máximo que quieres gastar en esa Categoría durante el mes."
          inputMode="decimal"
          autoComplete="off"
          placeholder="300.00"
          value={draft.amount}
          onChange={(event) => change({ amount: event.target.value })}
          errors={errors.amount}
        />

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
          <Link to={cancelTo} className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
      {children}
    </section>
  )
}
