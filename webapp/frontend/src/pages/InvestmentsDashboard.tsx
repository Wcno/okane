import { ChartLine } from 'lucide-react'
import { Card } from '../components/dashboard/Card'
import { DistributionCard } from '../components/investments/DistributionCard'
import { Figure, HeroMoney, InvestmentHeader, ReturnLine } from '../components/investments/Figures'
import { EmptyState, Pending } from '../components/screen/Screen'
import { getDashboard, type InvestmentsDashboard as Dashboard } from '../investments/portfolio'
import { performancePath } from '../investments/presentation'
import { formatMoney } from '../lib/money'
import { useLoaded } from '../lib/useLoaded'

function AccountRows({ dashboard }: { dashboard: Dashboard }) {
  return (
    <ul className="mt-2 divide-y divide-line">
      {dashboard.accounts.map((account) => (
        <li key={account.id} className="flex items-start gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium">
              {account.name}
              {account.archived && <span className="font-normal text-ink-3"> · Archivada</span>}
            </p>
            <p className="text-[0.87rem] leading-snug text-ink-3">
              Aporte neto {formatMoney(account.netContribution)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums">{formatMoney(account.value)}</p>
            <ReturnLine value={account.return} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** The portfolio at a glance: what it is worth, what the User put in, what it earned and how it splits. */
export function InvestmentsDashboard() {
  const { state, retry } = useLoaded(getDashboard)

  if (state.status !== 'ready') {
    return (
      <>
        <InvestmentHeader title="Inversiones" intro="El valor de tu portafolio, lo que has aportado y lo que ha rendido." />
        <Pending state={state} retry={retry} loading="Cargando tus inversiones…" />
      </>
    )
  }

  const dashboard = state.value
  if (dashboard.accounts.length === 0) {
    return (
      <>
        <InvestmentHeader title="Inversiones" intro="El valor de tu portafolio, lo que has aportado y lo que ha rendido." />
        <EmptyState
          icon={ChartLine}
          title="Aún no tienes una Cuenta de inversión"
          text="Crea la Cuenta de tu bróker, fondéala con una Transferencia y registra tus compras. Aquí verás su valor, tu Aporte neto y su Rendimiento."
          action={{ to: '/accounts/create', label: 'Crear cuenta' }}
        />
      </>
    )
  }

  return (
    <>
      <InvestmentHeader
        title="Inversiones"
        intro="El valor de tu portafolio, lo que has aportado y lo que ha rendido."
        action={{ to: '/investments/transactions/buy', label: 'Registrar compra' }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
          <Card id="portfolio-value" title="Valor del portafolio" link={{ to: performancePath, text: 'Rendimiento' }}>
            <HeroMoney amount={dashboard.value} />
            <div className="mt-3.5">
              <ReturnLine value={dashboard.return} suffix="de Rendimiento sobre tu Aporte neto" />
            </div>
            {dashboard.estimated && (
              <p className="mt-2 max-w-[52ch] text-[0.87rem] text-ink-3">
                Algunos precios son estimados: vienen de tu última operación. Corrígelos en la distribución para valorar con tu precio.
              </p>
            )}
            <dl className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <Figure label="Aporte neto" hint="Lo que has puesto, menos lo que has retirado">
                {formatMoney(dashboard.netContribution)}
              </Figure>
              <Figure label="Rendimiento" hint="Valor actual menos Aporte neto">
                {formatMoney(dashboard.return.amount, { sign: true })}
              </Figure>
              <Figure label="Efectivo" hint="Sin invertir en las Cuentas">
                {formatMoney(dashboard.cash)}
              </Figure>
              <Figure label="Posiciones" hint="Valor de lo que tienes comprado">
                {formatMoney(dashboard.positionsValue)}
              </Figure>
            </dl>
          </Card>
          <Card id="investment-accounts" title="Cuentas de inversión" link={{ to: '/accounts', text: 'Cuentas' }}>
            <AccountRows dashboard={dashboard} />
          </Card>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <DistributionCard dashboard={dashboard} />
        </div>
      </div>
    </>
  )
}
