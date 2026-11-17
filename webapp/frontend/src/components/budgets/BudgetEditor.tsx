import type { ReactNode } from 'react'
import type { Budget, BudgetField, BudgetInput } from '../../budgets/api'
import type { BudgetDraft } from '../../budgets/form'
import { useBudgetForm } from '../../budgets/useBudgetForm'
import type { Outcome } from '../../lib/http'
import { CategoryField } from '../record/CategoryField'
import { RecordEditor } from '../record/RecordEditor'
import { TextField } from '../TextField'

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
  onSaved: (budget: Budget) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  cancelTo: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useBudgetForm({ initial, save, onSaved })

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo={cancelTo}
      fields={
        <>
          <CategoryField idPrefix="budget" draft={draft} onChange={change} errors={errors} />
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
        </>
      }
    >
      {children}
    </RecordEditor>
  )
}
