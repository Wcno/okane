import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { OneExpenseScreen } from '../components/expenses/OneExpenseScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { deleteExpense, type Expense } from '../expenses/api'
import { describeExpense, expensesBack } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterExpenseChange'
import { formatMoney } from '../lib/money'

function Confirmation({ expense, accounts }: { expense: Expense; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterExpenseChange()
  const account = accounts.find((candidate) => candidate.id === expense.accountId)
  const { title, details } = describeExpense(expense, account?.name, { withDate: true })

  return (
    <>
      <ScreenHeader title="Eliminar gasto" back={expensesBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={expense.categoryId} />}
            title={title}
            details={details}
            amount={expense.amount}
          />
        }
        message={
          <>
            Se borrará por completo y no podrás recuperarlo.
            {account && ` El Saldo de ${account.name} subirá ${formatMoney(expense.amount)}.`}
          </>
        }
        cancel={{ to: '/expenses', label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar gasto',
          busyLabel: 'Eliminando…',
          run: () => deleteExpense(expense.id, csrfToken),
          onSaved: () => afterChange('deleted', expense),
          failure: 'No pudimos eliminar el gasto. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes an Expense on its own screen, saying what happens to the Balance first. */
export function ExpenseDelete() {
  return (
    <OneExpenseScreen title="Eliminar gasto">
      {(expense, accounts) => <Confirmation expense={expense} accounts={accounts} />}
    </OneExpenseScreen>
  )
}
