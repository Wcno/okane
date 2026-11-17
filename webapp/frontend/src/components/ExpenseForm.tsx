import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { listAccounts, type Account } from '../accounts/api'
import { todayInPanama } from '../accounts/form'
import { useSignedInUser } from '../auth/context'
import { categoryById } from '../data/categories'
import { remainingBudget } from '../data/sample'
import { createExpense, lastUsedAccountId } from '../expenses/api'
import { announceExpenseChange } from '../expenses/changes'
import { chooseDefaultAccount, parseAmount } from '../expenses/form'
import { offeredAccounts } from '../expenses/presentation'
import { useExpenseForm } from '../expenses/useExpenseForm'
import { formatMoney } from '../lib/money'
import { useLoaded } from '../lib/useLoaded'
import { useData } from '../state/context'
import { primaryButtonClassName, secondaryButtonClassName } from './buttons'
import { ExpenseFields } from './expenses/ExpenseFields'
import { FormAlert } from './FormAlert'

/**
 * The consequence of the Expense on its Category. Budgets arrive with a later
 * ticket: until then this reads the sample budgets, as the Panel does.
 */
function RemainingHint({ categoryId, amount }: { categoryId: number | null; amount: number | null }) {
  const { state } = useData()
  const category = categoryId === null ? null : categoryById(categoryId).name
  const line = state.budgets.find((budget) => budget.category === category)
  const currentRemaining = line ? remainingBudget(line) : null
  const nextRemaining =
    currentRemaining !== null && amount !== null ? Math.round((currentRemaining - amount) * 100) / 100 : null

  return (
    <p className="min-h-[1.4em] text-[0.9rem] text-ink-2" aria-live="polite">
      {category !== null &&
        amount !== null &&
        (currentRemaining === null || nextRemaining === null
          ? `${category} no tiene Presupuesto este mes; el gasto se registra igual.`
          : nextRemaining < 0
            ? `${category} quedará excedida por ${formatMoney(-nextRemaining)}; el gasto se registra igual.`
            : `Restante en ${category}: de ${formatMoney(currentRemaining)} a ${formatMoney(nextRemaining)}.`)}
    </p>
  )
}

function SheetTitle({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 id="expense-form-title" className="text-[1.25rem] font-semibold tracking-[-0.01em]">
        Registrar gasto
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="-mr-2 grid size-9 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

function QuickForm({ accounts, lastUsed }: { accounts: Account[]; lastUsed: number | null }) {
  const { csrfToken } = useSignedInUser()
  const { state, lastAccountId: sampleAccountId, register, closeForm } = useData()
  const amountField = useRef<HTMLInputElement>(null)
  const today = todayInPanama()

  useEffect(() => {
    amountField.current?.focus()
  }, [])

  const { form, draft, change, errors, isSubmitting, submit } = useExpenseForm({
    initial: { amount: '', categoryId: null, accountId: chooseDefaultAccount(accounts, lastUsed), date: today, description: '' },
    accounts,
    today,
    save: (expense) => createExpense(expense, csrfToken),
    onSaved: (expense) => {
      const category = categoryById(expense.categoryId).name
      const amount = Number(expense.amount)
      const line = state.budgets.find((budget) => budget.category === category)
      const currentRemaining = line ? remainingBudget(line) : null
      const nextRemaining = currentRemaining !== null ? Math.round((currentRemaining - amount) * 100) / 100 : null
      const consequence =
        nextRemaining === null
          ? `${category} no tiene Presupuesto este mes.`
          : nextRemaining < 0
            ? `${category} queda excedida por ${formatMoney(-nextRemaining)}.`
            : `Restante en ${category}: ${formatMoney(nextRemaining)}.`
      register(
        { amount, category, accountId: sampleAccountId },
        `Gasto de ${formatMoney(amount)} registrado. ${consequence}`,
      )
      announceExpenseChange()
      closeForm()
    },
  })

  const amount = parseAmount(draft.amount)
  const amountNumber = amount === null ? null : Number(amount)

  return (
    <form
      ref={form}
      onSubmit={submit}
      noValidate
      className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-6"
    >
      <SheetTitle onClose={closeForm} />
      {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}
      <ExpenseFields
        idPrefix="expense"
        draft={draft}
        onChange={change}
        errors={errors}
        accounts={accounts}
        today={today}
        amountRef={amountField}
        hint={<RemainingHint categoryId={draft.categoryId} amount={amountNumber} />}
      />
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={closeForm} className={`${secondaryButtonClassName} flex-1`}>
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} flex-[1.6]`}>
          {isSubmitting ? 'Registrando…' : 'Registrar gasto'}
          {!isSubmitting && amount !== null && draft.categoryId !== null && (
            <span className="sr-only">
              {' '}
              de {formatMoney(amount)} en {categoryById(draft.categoryId).name}
            </span>
          )}
        </button>
      </div>
    </form>
  )
}

/** Loads what the form needs: the Accounts that can take an Expense and the last one used. */
function QuickSheetContent() {
  const { closeForm } = useData()
  const { state, retry } = useLoaded(async () => {
    const [accounts, lastUsed] = await Promise.all([listAccounts(), lastUsedAccountId()])
    return { accounts: offeredAccounts(accounts), lastUsed }
  }, 'quick-form')

  if (state.status === 'ready' && state.value.accounts.length > 0) {
    return <QuickForm accounts={state.value.accounts} lastUsed={state.value.lastUsed} />
  }
  return (
    <div className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-6">
      <SheetTitle onClose={closeForm} />
      {state.status === 'loading' && (
        <p role="status" className="text-ink-3">
          Cargando tus Cuentas…
        </p>
      )}
      {(state.status === 'failed' || state.status === 'gone') && (
        <>
          <FormAlert>{state.message}</FormAlert>
          <button type="button" onClick={retry} className={secondaryButtonClassName}>
            Reintentar
          </button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <p className="text-ink-2">
            Un gasto sale de una Cuenta de gastos o de ahorro. Crea la que usas para pagar y vuelve aquí.
          </p>
          <Link to="/accounts/create" onClick={closeForm} className={primaryButtonClassName}>
            Crear cuenta
          </Link>
        </>
      )}
    </div>
  )
}

/** Quick expense entry from any screen. Date defaults to today and Account to the last one used. */
export function ExpenseForm() {
  const { isFormOpen, closeForm } = useData()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (isFormOpen && !element.open) element.showModal()
    else if (!isFormOpen && element.open) element.close()
  }, [isFormOpen])

  return (
    <dialog
      ref={dialog}
      onClose={closeForm}
      onClick={(event) => {
        if (event.target === dialog.current) closeForm()
      }}
      aria-labelledby="expense-form-title"
      className="sheet mx-0 mb-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[1.75rem] bg-surface text-ink shadow-float sm:m-auto sm:w-[30rem] sm:rounded-[1.75rem]"
    >
      {isFormOpen && <QuickSheetContent />}
    </dialog>
  )
}
