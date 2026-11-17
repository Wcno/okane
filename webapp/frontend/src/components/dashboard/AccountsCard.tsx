import { accountTypeLabels } from '../../accounts/presentation'
import type { Dashboard } from '../../dashboard/api'
import { AccountIcon } from '../accounts/AccountIcon'
import { RecordRow } from '../screen/RecordRow'
import { Card } from './Card'

/** The Saldo of each Account; their sum is the Patrimonio. */
export function AccountsCard({ accounts }: Pick<Dashboard, 'accounts'>) {
  return (
    <Card id="accounts" title="Cuentas" link={{ to: '/accounts', text: 'Ver todas' }}>
      <ul className="mt-3 divide-y divide-line">
        {accounts.map((account) => (
          <RecordRow
            key={account.id}
            to={`/accounts/${account.id}/edit`}
            action="Editar Cuenta"
            icon={<AccountIcon account={account} />}
            title={account.name}
            details={account.archived ? `${accountTypeLabels[account.type]} · Archivada` : accountTypeLabels[account.type]}
            amount={account.balance}
          />
        ))}
      </ul>
    </Card>
  )
}
