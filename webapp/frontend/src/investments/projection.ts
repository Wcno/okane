import { write, type FieldErrors, type Outcome } from '../lib/http'

/** What a Projection starts from: one Account, or the portfolio of investment Accounts. */
export type ProjectionSelection = { kind: 'portfolio' } | { kind: 'account'; accountId: number }

/** A scenario as api-service takes it; money and the rate are decimal strings, the rate a ratio (12% is "0.12"). */
export interface ScenarioInput {
  /** Null starts from the value of the selection. */
  initialCapital: string | null
  monthlyContribution: string
  months: number
  annualRate: string
}

export interface MonthlyPoint {
  month: number
  capital: string
  contributed: string
}

export interface ProjectedScenario {
  initialCapital: string
  monthlyContribution: string
  months: number
  annualRate: string
  contributed: string
  finalCapital: string
  result: string
  series: MonthlyPoint[]
}

export interface ProjectionSource {
  kind: 'portfolio' | 'account'
  account: { id: number; name: string; type: 'savings' | 'investment' } | null
  value: string
  asOf: string
  /** A savings Balance, or a valuation of cash plus Positions at Reference Prices. */
  basis: 'balance' | 'valuation'
  estimated: boolean
  /** The rate the User saved on a savings Account, as a ratio; offered, never applied by itself. */
  savedAnnualRate: string | null
}

export interface Projection {
  source: ProjectionSource
  scenarios: ProjectedScenario[]
}

/** Errors by scenario position and field; `form` holds what belongs to none. */
export type ProjectionErrors = FieldErrors<string>

interface ProjectionBody {
  source: {
    kind: 'portfolio' | 'account'
    account: ProjectionSource['account']
    value: string
    as_of: string
    basis: 'balance' | 'valuation'
    estimated: boolean
    saved_annual_rate: string | null
  }
  scenarios: {
    initial_capital: string
    monthly_contribution: string
    months: number
    annual_rate: string
    contributed: string
    final_capital: string
    result: string
    series: MonthlyPoint[]
  }[]
}

const toProjection = (body: ProjectionBody): Projection => ({
  source: {
    kind: body.source.kind,
    account: body.source.account,
    value: body.source.value,
    asOf: body.source.as_of,
    basis: body.source.basis,
    estimated: body.source.estimated,
    savedAnnualRate: body.source.saved_annual_rate,
  },
  scenarios: body.scenarios.map((scenario) => ({
    initialCapital: scenario.initial_capital,
    monthlyContribution: scenario.monthly_contribution,
    months: scenario.months,
    annualRate: scenario.annual_rate,
    contributed: scenario.contributed,
    finalCapital: scenario.final_capital,
    result: scenario.result,
    series: scenario.series,
  })),
})

export const SCENARIO_LIMIT = 3
export type ScenarioField = 'initial_capital' | 'monthly_contribution' | 'months' | 'annual_rate'
const scenarioFieldNames: ScenarioField[] = ['initial_capital', 'monthly_contribution', 'months', 'annual_rate']

/** The key under which a scenario's field comes back in errors. */
export const scenarioKey = (position: number, field: ScenarioField) => `scenarios.${position}.${field}`

const scenarioFields: Record<string, string> = Object.fromEntries(
  [
    ...Array.from({ length: SCENARIO_LIMIT }, (_, position) => scenarioFieldNames.map((field) => scenarioKey(position, field))).flat(),
    'scenarios',
    'selection',
  ].map((key) => [key, key]),
)

const GONE ='Esta Cuenta ya no existe. Elige otra para proyectar.'

/** Compares scenarios without storing anything. Errors come keyed `scenarios.<position>.<field>`. */
export function projectScenarios(
  selection: ProjectionSelection,
  scenarios: ScenarioInput[],
  csrfToken: string,
): Promise<Outcome<Projection, string>> {
  return write<Projection, string>({
    method: 'POST',
    path: '/api/investments/projection',
    csrfToken,
    gone: GONE,
    body: {
      selection: selection.kind === 'portfolio' ? { kind: 'portfolio' } : { kind: 'account', account_id: selection.accountId },
      scenarios: scenarios.map((scenario) => ({
        initial_capital: scenario.initialCapital,
        monthly_contribution: scenario.monthlyContribution,
        months: scenario.months,
        annual_rate: scenario.annualRate,
      })),
    },
    fields: scenarioFields,
    read: async (response) => toProjection(await response.json()),
  })
}
