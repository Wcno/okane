import type { Account } from '../accounts/api'
import { offeredAccounts } from '../accounts/presentation'
import { useSignedInUser } from '../auth/context'
import { IncomeEditor } from '../components/incomes/IncomeEditor'
import { OneIncomeScreen } from '../components/incomes/OneIncomeScreen'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { updateIncome, type Income } from '../incomes/api'
import { incomesBack } from '../incomes/presentation'
import { useAfterIncomeChange } from '../incomes/useAfterIncomeChange'

function EditForm({ income, accounts }: { income: Income; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterIncomeChange()
  const current = accounts.find((account) => account.id === income.accountId)
  const isOnArchivedAccount = current !== undefined && current.archivedAt !== null

  return (
    <>
      <ScreenHeader title="Editar ingreso" back={incomesBack} />
      <IncomeEditor
        initial={{
          amount: income.amount,
          accountId: income.accountId,
          date: income.date,
          description: income.description,
        }}
        accounts={offeredAccounts(accounts, income.accountId)}
        save={(input) => updateIncome(income.id, input, csrfToken)}
        onSaved={(saved) => afterChange('updated', saved)}
        idPrefix="income"
        cancelTo={incomesBack.to}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        accountNote={
          isOnArchivedAccount
            ? 'Esta Cuenta está archivada. Puedes corregir el ingreso, pero ya no se ofrece para ingresos nuevos.'
            : undefined
        }
      >
        <DeleteLink to={`/incomes/${income.id}/delete`}>Eliminar este ingreso</DeleteLink>
      </IncomeEditor>
    </>
  )
}

/** Corrects an Income: any field, including its Account. The Balances follow. */
export function IncomeEdit() {
  return (
    <OneIncomeScreen title="Editar ingreso">
      {(income, accounts) => <EditForm key={income.id} income={income} accounts={accounts} />}
    </OneIncomeScreen>
  )
}
