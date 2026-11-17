import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { currentAccount, type Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { getBudgetMonth } from '../budgets/api'
import { confirmationText, previewText, remainingAfter, remainingNow } from '../budgets/remaining'
import { useBudgetMonth } from '../budgets/useBudgetMonth'
import { categoryById } from '../data/categories'
import { createExpense, type Expense } from '../expenses/api'
import { chooseDefaultAccount } from '../expenses/form'
import { typedAmount } from '../lib/amount'
import { balanceSentence } from '../accounts/presentation'
import { NEEDS_AN_ACCOUNT_FOR_EXPENSE } from '../expenses/presentation'
import { announceExpenseRevision } from '../expenses/revision'
import { useExpenseAccounts } from '../expenses/useExpenseAccounts'
import { useExpenseForm } from '../expenses/useExpenseForm'
import { todayInPanama } from '../lib/dates'
import { isMonth, monthOf } from '../lib/months'
import { formatMoney } from '../lib/money'
import { useData } from '../state/context'
import { primaryButtonClassName, secondaryButtonClassName } from './buttons'
import { ExpenseFields } from './expenses/ExpenseFields'
import { NeedsAnAccount } from './record/NeedsAnAccount'
import { FormAlert } from './FormAlert'

/**
 * The consequence of the Expense on the Restante of its Category, read from
 * the Budgets of the month of its date. Once a Category is chosen its room is
 * kept, so the lines below do not move while the amount is typed.
 */
function RemainingHint({ categoryId, amount, date }: { categoryId: number | null; amount: string | null; date: string }) {
  const { state } = useBudgetMonth(isMonth(monthOf(date)) ? monthOf(date) : monthOf(todayInPanama()))
  if (categoryId === null) return null
  const category = categoryById(categoryId).name

  let text = ''
  if (amount === null) text = `Escribe el monto para ver lo que queda en ${category}.`
  else if (state.status === 'ready') text = previewText(category, remainingAfter(state.value, categoryId, amount))

  return <p className="mt-3 min-h-[2.8em] text-[0.9rem] leading-snug text-ink-2">{text}</p>
}

/** What the Expense left of its Category's Budget, read after it was saved; empty when it cannot be read. */
async function restanteSentence(expense: Pick<Expense, 'categoryId' | 'date'>): Promise<string> {
  try {
    const month = await getBudgetMonth(monthOf(expense.date))
    return confirmationText(categoryById(expense.categoryId).name, remainingNow(month, expense.categoryId))
  } catch {
    return ''
  }
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
        className="-mr-3 grid size-[44px] place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

function QuickForm({ accounts, lastUsed }: { accounts: Account[]; lastUsed: number | null }) {
  const { csrfToken } = useSignedInUser()
  const { announce, closeForm } = useData()
  const amountField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountField.current?.focus()
  }, [])

  const { form, draft, change, errors, isSubmitting, submit } = useExpenseForm({
    initial: {
      amount: '',
      categoryId: null,
      accountId: chooseDefaultAccount(accounts, lastUsed),
      date: todayInPanama(),
      description: '',
    },
    accounts,
    save: (expense) => createExpense(expense, csrfToken),
    onSaved: async (expense) => {
      const [account, consequence] = await Promise.all([currentAccount(expense.accountId), restanteSentence(expense)])
      announce(
        [`Gasto de ${formatMoney(expense.amount)} registrado.`, consequence, balanceSentence(account)]
          .filter(Boolean)
          .join(' '),
      )
      announceExpenseRevision()
      closeForm()
    },
  })

  const amount = typedAmount(draft.amount)

  return (
    <form ref={form} onSubmit={submit} noValidate className="px-5 pt-5 sm:px-7 sm:pt-6">
      <div className="space-y-5">
        <SheetTitle onClose={closeForm} />
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}
        <ExpenseFields
          idPrefix="quick-expense"
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          amountRef={amountField}
          hint={<RemainingHint categoryId={draft.categoryId} amount={amount} date={draft.date} />}
        />
      </div>
      {/* Stays at the foot of the sheet while the fields scroll, so the action is never below the fold. */}
      <div className="sticky bottom-0 -mx-5 mt-5 flex gap-3 border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-7 sm:px-7 sm:pb-5">
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
  const { state, retry } = useExpenseAccounts()

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
      {state.status === 'ready' && <NeedsAnAccount text={NEEDS_AN_ACCOUNT_FOR_EXPENSE} onLeave={closeForm} />}
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
