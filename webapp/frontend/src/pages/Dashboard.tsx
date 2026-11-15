import { AccountsCard } from '../components/dashboard/AccountsCard'
import { AvailableCard } from '../components/dashboard/AvailableCard'
import { UpcomingPaymentsCard } from '../components/dashboard/UpcomingPaymentsCard'
import { NetWorthCard } from '../components/dashboard/NetWorthCard'
import { BudgetRemainingCard } from '../components/dashboard/BudgetRemainingCard'
import { remainingDays, today } from '../data/sample'

/** Home screen: the two product answers and their supporting information. */
export function Dashboard() {
  const month = today.month.charAt(0).toUpperCase() + today.month.slice(1)

  return (
    <>
      <header className="mb-5 lg:mb-7 lg:pr-48">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">
          {month} de {today.year}
        </h1>
        <p className="mt-0.5 text-ink-2">
          Domingo {today.day} · quedan {remainingDays} días del mes
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
          <AvailableCard />
          <BudgetRemainingCard />
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-5 lg:space-y-5">
          <NetWorthCard />
          <UpcomingPaymentsCard />
          <AccountsCard />
        </div>
      </div>

      <p className="mt-6 text-center text-[0.87rem] text-ink-3 lg:hidden">
        Estás viendo datos de ejemplo.
      </p>
    </>
  )
}
