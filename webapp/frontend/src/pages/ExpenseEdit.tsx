import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { ExpenseEditor } from '../components/expenses/ExpenseEditor'
import { OneExpenseScreen } from '../components/expenses/OneExpenseScreen'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { updateExpense, type Expense } from '../expenses/api'
import { offeredAccounts } from '../accounts/presentation'
import { expensesBack } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterExpenseChange'

function EditForm({ expense, accounts }: { expense: Expense; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterExpenseChange()
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
        save={(input) => updateExpense(expense.id, input, csrfToken)}
        onSaved={(saved) => afterChange('updated', saved)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        cancelTo="/expenses"
        accountNote={
          isOnArchivedAccount
            ? 'Esta Cuenta está archivada. Puedes corregir el gasto, pero ya no se ofrece para gastos nuevos.'
            : undefined
        }
      >
        <DeleteLink to={`/expenses/${expense.id}/delete`}>Eliminar este gasto</DeleteLink>
      </ExpenseEditor>
    </>
  )
}

/** Corrects an Expense: any field, including its Account. The Balances follow. */
export function ExpenseEdit() {
  return (
    <OneExpenseScreen title="Editar gasto">
      {(expense, accounts) => <EditForm key={expense.id} expense={expense} accounts={accounts} />}
    </OneExpenseScreen>
  )
}
