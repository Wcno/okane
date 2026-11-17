import { Wallet } from 'lucide-react'
import { AccountsCard } from '../components/dashboard/AccountsCard'
import { AvailableCard } from '../components/dashboard/AvailableCard'
import { BudgetRemainingCard } from '../components/dashboard/BudgetRemainingCard'
import { NetWorthCard } from '../components/dashboard/NetWorthCard'
import { UpcomingPaymentsCard } from '../components/dashboard/UpcomingPaymentsCard'
import { EmptyState, Pending, ScreenHeader } from '../components/screen/Screen'
import type { Dashboard as DashboardFigures } from '../dashboard/api'
import { daysLeftText } from '../dashboard/presentation'
import { useDashboard } from '../dashboard/useDashboard'
import { monthName } from '../lib/months'

function Figures({ dashboard }: { dashboard: DashboardFigures }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
        <AvailableCard dashboard={dashboard} />
        <BudgetRemainingCard budgets={dashboard.budgets} />
      </div>
      <div className="min-w-0 space-y-4 lg:col-span-5 lg:space-y-5">
        <NetWorthCard dashboard={dashboard} />
        <UpcomingPaymentsCard overdue={dashboard.overdue} upcoming={dashboard.upcoming} />
        <AccountsCard accounts={dashboard.accounts} />
      </div>
    </div>
  )
}

/** Home screen: the two product answers and their supporting information, all computed by api-service. */
export function Dashboard() {
  const { state, retry } = useDashboard()
  const ready = state.status === 'ready' ? state.value : null

  return (
    <>
      <ScreenHeader
        title={ready ? monthName(ready.month) : 'Panel'}
        intro={ready && ready.accounts.length > 0 ? daysLeftText(ready.daysLeft) : undefined}
      />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tu Panel…" />
      ) : state.value.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Empieza creando tu primera Cuenta"
          text="Tu Disponible sale del Saldo de tus Cuentas de gastos. Crea la que usas a diario, con lo que tiene hoy, y Okane calcula el resto."
          action={{ to: '/accounts/create', label: 'Crear tu primera Cuenta' }}
        />
      ) : (
        <Figures dashboard={state.value} />
      )}
    </>
  )
}
