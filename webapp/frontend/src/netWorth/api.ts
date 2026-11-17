import { readJson } from '../lib/http'

/** One month of the Patrimonio series, as api-service derived it. Amounts stay decimal strings. */
export interface NetWorthPeriod {
  /** The calendar month, as 2026-11. */
  month: string
  /** The day whose close opens the period, and the one that closes it (today for the current month). */
  openingCut: string
  closingCut: string
  openingNetWorth: string
  netWorth: string
  /** Opening balances of the Accounts that started in the period: neither savings nor return. */
  openingBalancesAdded: string
  netSavings: string
  /** Rendimiento del período, not the cumulative one. */
  periodReturn: string
  /** Some price in the period's cuts comes from the last Transacción de inversión, not a known price. */
  estimated: boolean
}

interface PeriodBody {
  month: string
  opening_cut: string
  closing_cut: string
  opening_net_worth: string
  net_worth: string
  opening_balances_added: string
  net_savings: string
  return: string
  estimated: boolean
}

const LOAD_FAILED = 'Okane no pudo consultar la evolución de tu Patrimonio. Espera un momento e inténtalo de nuevo.'

/** The User's monthly Patrimonio, oldest month first, up to the current month. */
export async function getNetWorthHistory(): Promise<NetWorthPeriod[]> {
  const body = await readJson<{ periods: PeriodBody[] }>('/api/net-worth/history', { failed: LOAD_FAILED })
  return body.periods.map((period) => ({
    month: period.month,
    openingCut: period.opening_cut,
    closingCut: period.closing_cut,
    openingNetWorth: period.opening_net_worth,
    netWorth: period.net_worth,
    openingBalancesAdded: period.opening_balances_added,
    netSavings: period.net_savings,
    periodReturn: period.return,
    estimated: period.estimated,
  }))
}
