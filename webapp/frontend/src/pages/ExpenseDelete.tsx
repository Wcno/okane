import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { OneExpenseScreen } from '../components/expenses/OneExpenseScreen'
import { FormAlert } from '../components/FormAlert'
import { ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import { deleteExpense, type Expense } from '../expenses/api'
import { expensesBack } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterExpenseChange'
import { formatDay } from '../accounts/form'
import { formatMoney } from '../lib/money'
import { useWrite } from '../lib/useWrite'

function Confirmation({ expense, accounts }: { expense: Expense; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const write = useWrite()
  const afterChange = useAfterExpenseChange()
  const [failure, setFailure] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const category = categoryById(expense.categoryId)
  const account = accounts.find((candidate) => candidate.id === expense.accountId)

  const confirm = async () => {
    if (isSubmitting) return
    setFailure(null)
    setIsSubmitting(true)
    const outcome = await write(() => deleteExpense(expense.id, csrfToken))
    if (!outcome.ok) {
      setIsSubmitting(false)
      setFailure(outcome.errors.form?.join(' ') ?? 'No pudimos eliminar el gasto. Inténtalo de nuevo.')
      return
    }
    await afterChange('Eliminaste', expense)
  }

  return (
    <>
      <ScreenHeader title="Eliminar gasto" back={expensesBack} />

      <section className={`${cardClassName} max-w-[34rem]`}>
        <div className="flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3.5">
          <CategoryChip categoryId={expense.categoryId} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1rem] font-medium">{expense.description || category.name}</h2>
            <p className="mt-0.5 truncate text-[0.87rem] text-ink-3">
              {[expense.description && category.name, account?.name, formatDay(expense.date)].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(expense.amount)}</span>
        </div>

        <p className="mt-4 text-ink-2">
          Se borrará por completo y no podrás recuperarlo.
          {account && (
            <>
              {' '}
              El Saldo de {account.name} subirá {formatMoney(expense.amount)}.
            </>
          )}
        </p>

        {failure && (
          <div className="mt-4">
            <FormAlert>{failure}</FormAlert>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
          <Link to="/expenses" className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="button" onClick={confirm} disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? 'Eliminando…' : 'Eliminar gasto'}
          </button>
        </div>
      </section>
    </>
  )
}

/** Deletes an Expense on its own screen, saying what happens to the Balance first. */
export function ExpenseDelete() {
  return <OneExpenseScreen title="Eliminar gasto">{(expense, accounts) => <Confirmation expense={expense} accounts={accounts} />}</OneExpenseScreen>
}
