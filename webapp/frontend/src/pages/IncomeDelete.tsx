import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { OneIncomeScreen } from '../components/incomes/OneIncomeScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { deleteIncome, type Income } from '../incomes/api'
import { describeIncome, incomesBack } from '../incomes/presentation'
import { useAfterIncomeChange } from '../incomes/useAfterIncomeChange'
import { formatMoney } from '../lib/money'

function Confirmation({ income, accounts }: { income: Income; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterIncomeChange()
  const account = accounts.find((candidate) => candidate.id === income.accountId)
  const { title, details } = describeIncome(income, account?.name, { withDate: true })

  return (
    <>
      <ScreenHeader title="Eliminar ingreso" back={incomesBack} />
      <ConfirmCard
        summary={<RecordSummary icon={<IncomeChip />} title={title} details={details} amount={income.amount} />}
        message={
          <>
            Se borrará por completo y no podrás recuperarlo.
            {account && ` El Saldo de ${account.name} bajará ${formatMoney(income.amount)}.`}
          </>
        }
        cancel={{ to: incomesBack.to, label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar ingreso',
          busyLabel: 'Eliminando…',
          run: () => deleteIncome(income.id, csrfToken),
          onSaved: () => afterChange('deleted', income),
          failure: 'No pudimos eliminar el ingreso. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes an Income on its own screen, saying what happens to the Balance first. */
export function IncomeDelete() {
  return (
    <OneIncomeScreen title="Eliminar ingreso">
      {(income, accounts) => <Confirmation income={income} accounts={accounts} />}
    </OneIncomeScreen>
  )
}
