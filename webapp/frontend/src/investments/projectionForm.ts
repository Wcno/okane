import { scenarioKey, type ProjectionErrors, type ScenarioInput } from './projection'

/** What a scenario holds while the User types; the rate is a percentage, as people say it. */
export interface ScenarioDraft {
  /** Empty starts from the value of the selection. */
  capital: string
  contribution: string
  months: string
  ratePercent: string
}

export type ProjectionKind = 'savings' | 'investment'

/** Server limit; keep equal to LONGEST_TERM in api-service/investments/projection.py. */
export const LONGEST_TERM = 600

/** Initial values: the selection's capital, no contribution, twelve months, rate zero. */
export const defaultDraft = (): ScenarioDraft => ({ capital: '', contribution: '0', months: '12', ratePercent: '0' })

const MONEY = /^\d+(\.\d{1,2})?$/
const PERCENT = /^(-?)(\d+)(?:\.(\d{1,4}))?$/

const CAPITAL_INVALID = 'Escribe el capital inicial, cero o mayor, con dos decimales como máximo. Ejemplo: 1000.00'
const CONTRIBUTION_INVALID = 'Escribe el aporte mensual, cero o mayor, con dos decimales como máximo. Ejemplo: 100.00'
const MONTHS_INVALID = `Escribe el plazo en meses, un número entero de 1 a ${LONGEST_TERM}.`
const RATE_INVALID = 'Escribe la tasa anual en porcentaje, con cuatro decimales como máximo. Ejemplo: 12'
const SAVINGS_RATE_NEGATIVE = 'La tasa de una Cuenta de ahorro es cero o mayor.'
const INVESTMENT_RATE_TOO_LOW = 'Una inversión admite una tasa mayor que -1200 % anual.'

/** 12 as "0.12", -12.5 as "-0.125": the ratio api-service takes, shifted as text so nothing is rounded. */
export function percentToRatio(percent: string): string | null {
  const match = PERCENT.exec(percent.trim())
  if (!match) return null
  const [, sign, whole, fraction = ''] = match
  const digits = `${whole.padStart(3, '0')}${fraction}`
  const ratio = `${digits.slice(0, -fraction.length - 2)}.${digits.slice(-fraction.length - 2)}`
  const trimmed = ratio.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace(/^0+(?=\d)/, '')
  return Number(trimmed) === 0 ? '0' : `${sign}${trimmed}`
}

/** "0.042500" as "4.25": a saved ratio as the percentage the field shows. */
export function ratioToPercent(ratio: string): string {
  const negative = ratio.startsWith('-')
  const [whole, fraction = ''] = ratio.replace(/^-/, '').split('.')
  const digits = `${whole}${fraction.padEnd(2, '0')}`
  const integer = digits.slice(0, whole.length + 2).replace(/^0+(?=\d)/, '')
  const decimals = digits.slice(whole.length + 2).replace(/0+$/, '')
  const text = decimals ? `${integer}.${decimals}` : integer
  return negative && Number(text) !== 0 ? `-${text}` : text
}

export type ProjectionDraftOutcome = { ok: true; scenarios: ScenarioInput[] } | { ok: false; errors: ProjectionErrors }

/** Checks what the browser can know before sending; api-service has the last word. */
export function validateScenarios(drafts: ScenarioDraft[], kind: ProjectionKind): ProjectionDraftOutcome {
  const errors: ProjectionErrors = {}
  const scenarios: ScenarioInput[] = []

  drafts.forEach((draft, position) => {
    const capital = draft.capital.trim()
    const contribution = draft.contribution.trim()
    const months = draft.months.trim()
    const ratio = percentToRatio(draft.ratePercent)

    if (capital !== '' && !MONEY.test(capital)) errors[scenarioKey(position, 'initial_capital')] = [CAPITAL_INVALID]
    if (!MONEY.test(contribution)) errors[scenarioKey(position, 'monthly_contribution')] = [CONTRIBUTION_INVALID]
    if (!/^\d+$/.test(months) || Number(months) < 1 || Number(months) > LONGEST_TERM) {
      errors[scenarioKey(position, 'months')] = [MONTHS_INVALID]
    }
    if (ratio === null) errors[scenarioKey(position, 'annual_rate')] = [RATE_INVALID]
    else if (kind === 'savings' && ratio.startsWith('-')) errors[scenarioKey(position, 'annual_rate')] = [SAVINGS_RATE_NEGATIVE]
    else if (kind === 'investment' && Number(ratio) <= -12) errors[scenarioKey(position, 'annual_rate')] = [INVESTMENT_RATE_TOO_LOW]

    scenarios.push({
      initialCapital: capital === '' ? null : capital,
      monthlyContribution: contribution,
      months: Number(months),
      annualRate: ratio ?? '0',
    })
  })

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, scenarios }
}
