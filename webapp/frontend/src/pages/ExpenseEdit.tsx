import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { todayInPanama } from '../accounts/form'
import { useSignedInUser } from '../auth/context'
import { ExpenseEditor } from '../components/expenses/ExpenseEditor'
import { OneExpenseScreen } from '../components/expenses/OneExpenseScreen'
import { ScreenHeader } from '../components/screen/Screen'
import { updateExpense, type Expense } from '../expenses/api'
import { expensesBack, offeredAccounts } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterChange'
import type { Account } from '../accounts/api'

function EditForm({ expense, accounts }: { expense: Expense; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterExpenseChange()
  const today = todayInPanama()
  const current = accounts.find((account) => account.id === expense.accountId)
  const isOnArchivedAccount = current !== undefined && current.archivedAt !== null

  return (
    <>
      <ScreenHeader title="Editar gasto" back={expensesBack} />
      <ExpenseEditor
        idPrefix="expense"
        initial={{
          amount: expense.amount,
          categoryId: expense.categoryId,
          accountId: expense.accountId,
          date: expense.date,
          description: expense.description,
        }}
        accounts={offeredAccounts(accounts, expense.accountId)}
        today={today}
        save={(input) => updateExpense(expense.id, input, csrfToken)}
        onSaved={(saved) => afterChange('Guardaste', saved)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        cancelTo="/expenses"
        accountNote={
          isOnArchivedAccount
            ? 'Esta Cuenta está archivada. Puedes corregir el gasto, pero ya no se ofrece para gastos nuevos.'
            : undefined
        }
      >
        <div className="mt-5 border-t border-line pt-4">
          <Link
            to={`/expenses/${expense.id}/delete`}
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[0.95rem] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <Trash2 size={17} aria-hidden="true" />
            Eliminar este gasto
          </Link>
        </div>
      </ExpenseEditor>
    </>
  )
}

/** Corrects an Expense: any field, including its Account. The Balances follow. */
export function ExpenseEdit() {
  return <OneExpenseScreen title="Editar gasto">{(expense, accounts) => <EditForm key={expense.id} expense={expense} accounts={accounts} />}</OneExpenseScreen>
}
