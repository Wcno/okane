import { readJson } from '../lib/http'
import { toAsset, type Asset, type AssetBody, type ReferencePrice } from './api'

/** Money gained or lost; the percent does not apply (null) without a positive base. */
export interface Return {
  amount: string
  percent: string | null
}

export interface InvestmentAccountFigures {
  id: number
  name: string
  archived: boolean
  cash: string
  positionsValue: string
  value: string
  netContribution: string
  return: Return
  estimated: boolean
}

/** The portfolio: every investment Account added up. Return = value - Net Contribution. */
export interface Portfolio {
  asOf: string
  value: string
  cash: string
  positionsValue: string
  netContribution: string
  return: Return
  /** True when some price comes from the last transaction instead of one the User set. */
  estimated: boolean
  accounts: InvestmentAccountFigures[]
}

export interface DistributionItem {
  asset: Asset
  value: string
  portfolioPercent: string | null
  price: ReferencePrice
}

export interface InvestmentsDashboard extends Portfolio {
  distribution: DistributionItem[]
  /** What the Assets left out of the distribution add up to; null when none was left out. */
  othersValue: string | null
  othersPercent: string | null
}

export interface PositionReturn {
  asset: Asset
  units: string
  cost: string
  value: string
  gain: string
  gainPercent: string | null
  price: ReferencePrice
}

export interface InvestmentsPerformance extends Portfolio {
  positions: PositionReturn[]
}

interface PortfolioBody {
  as_of: string
  value: string
  cash: string
  positions_value: string
  net_contribution: string
  return: Return
  estimated: boolean
  accounts: {
    id: number
    name: string
    archived: boolean
    cash: string
    positions_value: string
    value: string
    net_contribution: string
    return: Return
    estimated: boolean
  }[]
}

export const toPortfolio = (body: PortfolioBody): Portfolio => ({
  asOf: body.as_of,
  value: body.value,
  cash: body.cash,
  positionsValue: body.positions_value,
  netContribution: body.net_contribution,
  return: body.return,
  estimated: body.estimated,
  accounts: body.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    archived: account.archived,
    cash: account.cash,
    positionsValue: account.positions_value,
    value: account.value,
    netContribution: account.net_contribution,
    return: account.return,
    estimated: account.estimated,
  })),
})

const DASHBOARD_FAILED = 'Okane no pudo consultar tus inversiones. Espera un momento e inténtalo de nuevo.'
const PERFORMANCE_FAILED = 'Okane no pudo consultar tu Rendimiento. Espera un momento e inténtalo de nuevo.'

export async function getDashboard(): Promise<InvestmentsDashboard> {
  const body = await readJson<
    PortfolioBody & {
      distribution: { asset: AssetBody; value: string; portfolio_percent: string | null; price: ReferencePrice }[]
      others_value: string | null
      others_percent: string | null
    }
  >('/api/investments/dashboard', { failed: DASHBOARD_FAILED })
  return {
    ...toPortfolio(body),
    distribution: body.distribution.map((item) => ({
      asset: toAsset(item.asset),
      value: item.value,
      portfolioPercent: item.portfolio_percent,
      price: item.price,
    })),
    othersValue: body.others_value,
    othersPercent: body.others_percent,
  }
}

export async function getPerformance(): Promise<InvestmentsPerformance> {
  const body = await readJson<
    PortfolioBody & {
      positions: {
        asset: AssetBody
        units: string
        cost: string
        value: string
        gain: string
        gain_percent: string | null
        price: ReferencePrice
      }[]
    }
  >('/api/investments/performance', { failed: PERFORMANCE_FAILED })
  return {
    ...toPortfolio(body),
    positions: body.positions.map((item) => ({
      asset: toAsset(item.asset),
      units: item.units,
      cost: item.cost,
      value: item.value,
      gain: item.gain,
      gainPercent: item.gain_percent,
      price: item.price,
    })),
  }
}
