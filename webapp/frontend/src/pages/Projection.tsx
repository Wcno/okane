import { Calculator, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { useAuth, useSignedInUser } from '../auth/context'
import { Card } from '../components/dashboard/Card'
import { FormAlert } from '../components/FormAlert'
import { primaryButtonClassName, smallSecondaryButtonClassName } from '../components/buttons'
import { Figure } from '../components/investments/Figures'
import { ProjectionChart } from '../components/investments/ProjectionChart'
import { fieldClassName, borderClassName } from '../components/record/RecordFields'
import { EmptyState, Pending, ScreenHeader } from '../components/screen/Screen'
import { TextField } from '../components/TextField'
import {
  projectScenarios,
  SCENARIO_LIMIT,
  scenarioKey,
  type Projection as ProjectionResult,
  type ProjectionErrors,
  type ProjectionSelection,
} from '../investments/projection'
import { defaultDraft, ratioToPercent, validateScenarios, type ScenarioDraft } from '../investments/projectionForm'
import { trendOf } from '../investments/presentation'
import { scenarioName, scenarioTone } from '../investments/projectionPresentation'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'

const PORTFOLIO = 'portfolio'
const intro = 'Compara hasta tres escenarios hipotéticos. Nada de lo que pruebes aquí se guarda ni cambia tus Cuentas.'
const FAILED = 'Okane no pudo calcular la proyección. Espera un momento e inténtalo de nuevo.'
const trendWord = { gain: 'Ganancia', loss: 'Pérdida', flat: 'Sin cambio' } as const

const toSelection = (value: string): ProjectionSelection =>
  value === PORTFOLIO ? { kind: 'portfolio' } : { kind: 'account', accountId: Number(value.slice('account:'.length)) }

/** Where the figure the projection starts from comes from, and its day. */
function Provenance({ source }: { source: ProjectionResult['source'] }) {
  const origin =
    source.basis === 'balance'
      ? 'Es el Saldo de la Cuenta'
      : 'Es el efectivo más las Posiciones, valoradas con tus Precios de referencia'
  return (
    <>
      <p className="mt-1 text-ink-2">
        {origin} al {formatDay(source.asOf)}.
      </p>
      {source.estimated && (
        <p className="mt-2 max-w-[52ch] text-[0.87rem] text-ink-3">
          Algunos precios son estimados: vienen de tu última operación, no de un precio fijado por ti.
        </p>
      )}
    </>
  )
}

function ScenarioForm({
  position,
  draft,
  errors,
  placeholder,
  savedRate,
  removable,
  onChange,
  onRemove,
}: {
  position: number
  draft: ScenarioDraft
  errors: ProjectionErrors
  placeholder: string
  savedRate: string | null
  removable: boolean
  onChange: (patch: Partial<ScenarioDraft>) => void
  onRemove: () => void
}) {
  const id = `scenario-${position + 1}`
  return (
    <fieldset className="min-w-0 rounded-card border border-line bg-surface p-5 shadow-card">
      <legend className="sr-only">{scenarioName(position)}</legend>
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-semibold" aria-hidden="true">
          <span className="size-2.5 rounded-full" style={{ background: scenarioTone(position) }} />
          {scenarioName(position)}
        </h3>
        {removable && (
          <button type="button" onClick={onRemove} className={smallSecondaryButtonClassName}>
            <X size={16} aria-hidden="true" />
            Quitar<span className="sr-only"> {scenarioName(position)}</span>
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-capital`}
          label="Capital inicial"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          hint="Vacío usa el valor de la selección."
          value={draft.capital}
          onChange={(event) => onChange({ capital: event.target.value })}
          errors={errors[scenarioKey(position, 'initial_capital')]}
        />
        <TextField
          id={`${id}-contribution`}
          label="Aporte mensual"
          inputMode="decimal"
          autoComplete="off"
          hint="Entra al cierre de cada mes."
          value={draft.contribution}
          onChange={(event) => onChange({ contribution: event.target.value })}
          errors={errors[scenarioKey(position, 'monthly_contribution')]}
        />
        <TextField
          id={`${id}-months`}
          label="Plazo en meses"
          inputMode="numeric"
          autoComplete="off"
          value={draft.months}
          onChange={(event) => onChange({ months: event.target.value })}
          errors={errors[scenarioKey(position, 'months')]}
        />
        <div>
          <TextField
            id={`${id}-rate`}
            label="Tasa anual (%)"
            inputMode="decimal"
            autoComplete="off"
            hint="Nominal; cada mes aplica la doceava parte."
            value={draft.ratePercent}
            onChange={(event) => onChange({ ratePercent: event.target.value })}
            errors={errors[scenarioKey(position, 'annual_rate')]}
          />
          {savedRate !== null && (
            <button
              type="button"
              onClick={() => onChange({ ratePercent: ratioToPercent(savedRate) })}
              className={`${smallSecondaryButtonClassName} mt-2`}
            >
              Usar tasa guardada ({ratioToPercent(savedRate)} %)
            </button>
          )}
        </div>
      </div>
    </fieldset>
  )
}

function ResultCard({ position, scenario }: { position: number; scenario: ProjectionResult['scenarios'][number] }) {
  const trend = trendOf(scenario.result)
  return (
    <Card id={`result-${position + 1}`} title={`${scenarioName(position)}: ${scenario.months} ${scenario.months === 1 ? 'mes' : 'meses'}`}>
      <dl className="mt-3 grid grid-cols-1 gap-3">
        <Figure label="Capital aportado" hint="Capital inicial más los aportes">
          {formatMoney(scenario.contributed)}
        </Figure>
        <Figure label="Capital final" hint={`Con tasa anual ${ratioToPercent(scenario.annualRate)} %`}>
          {formatMoney(scenario.finalCapital)}
        </Figure>
        <Figure label="Resultado" hint={trendWord[trend]}>
          {formatMoney(scenario.result, { sign: true })}
        </Figure>
      </dl>
    </Card>
  )
}

function MonthlyTable({ scenarios }: { scenarios: ProjectionResult['scenarios'] }) {
  const months = Math.max(...scenarios.map((scenario) => scenario.months))
  return (
    <details className="mt-4">
      <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium text-ink-2 hover:text-ink">
        Ver la tabla mensual
      </summary>
      <div role="region" aria-label="Tabla mensual de la proyección" tabIndex={0} className="mt-2 max-h-[22rem] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-max border-collapse text-left text-[0.9rem] tabular-nums">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-ink-2">
                Mes
              </th>
              {scenarios.map((_, position) => (
                <th key={position} scope="col" className="px-3 py-2 text-right font-medium text-ink-2">
                  {scenarioName(position)}: capital y aportado
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: months }, (_, index) => (
              <tr key={index} className="border-t border-line">
                <th scope="row" className="px-3 py-1.5 font-normal text-ink-2">
                  {index + 1}
                </th>
                {scenarios.map((scenario, position) => {
                  const point = scenario.series[index]
                  return (
                    <td key={position} className="px-3 py-1.5 text-right">
                      {point ? (
                        <>
                          {formatMoney(point.capital)} <span className="text-ink-3">({formatMoney(point.contributed)})</span>
                        </>
                      ) : (
                        <span className="text-ink-3">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Comparator({ accounts, initialSelection }: { accounts: Account[]; initialSelection: string }) {
  const { csrfToken } = useSignedInUser()
  const { reload } = useAuth()
  const [selectionValue, setSelectionValue] = useState(initialSelection)
  const [drafts, setDrafts] = useState<ScenarioDraft[]>([defaultDraft()])
  const [result, setResult] = useState<ProjectionResult | null>(null)
  const [errors, setErrors] = useState<ProjectionErrors>({})
  const [calculating, setCalculating] = useState(true)
  const latest = useRef(0)


  const run = useCallback(
    async (value: string, scenarioDrafts: ScenarioDraft[]) => {
      const account = accounts.find((item) => `account:${item.id}` === value)
      const checked = validateScenarios(scenarioDrafts, account?.type === 'savings' ? 'savings' : 'investment')
      if (!checked.ok) {
        setErrors(checked.errors)
        return
      }
      const request = ++latest.current
      setErrors({})
      setCalculating(true)
      const outcome = await projectScenarios(toSelection(value), checked.scenarios, csrfToken)
      if (request !== latest.current) return
      setCalculating(false)
      if (outcome.ok) setResult(outcome.value)
      else if (outcome.sessionEnded) reload()
      else setErrors({ ...outcome.errors, form: outcome.errors.form ?? (Object.keys(outcome.errors).length === 0 ? [FAILED] : undefined) })
    },
    [accounts, csrfToken, reload],
  )

  // The first projection starts from the defaults, so the value and provenance of the selection show at once.
  const firstRun = useRef(run)
  useEffect(() => {
    void firstRun.current(initialSelection, [defaultDraft()])
  }, [initialSelection])

  // A new selection starts over with the defaults, and its value and provenance come with them.
  const select = (value: string) => {
    const fresh = [defaultDraft()]
    setSelectionValue(value)
    setDrafts(fresh)
    void run(value, fresh)
  }

  const change = (position: number, patch: Partial<ScenarioDraft>) => {
    setDrafts((current) => current.map((draft, index) => (index === position ? { ...draft, ...patch } : draft)))
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !Object.keys(patch).length || !key.startsWith(`scenarios.${position}.`))),
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(selectionValue, drafts)
  }

  const source = result?.source
  const savedRate = source?.account?.type === 'savings' ? source.savedAnnualRate : null
  const options = accounts.filter((account) => !account.archivedAt && account.type !== 'spending')
  const hasInvestment = options.some((account) => account.type === 'investment')
  const fieldErrors = [errors.form, errors.scenarios, errors.selection].flat().filter((message): message is string => Boolean(message))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
      <form onSubmit={submit} noValidate className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
        <Card id="start" title="Punto de partida">
          <div className="mt-3">
            <label htmlFor="projection-selection" className="text-[0.9rem] font-medium text-ink-2">
              Qué proyectar
            </label>
            <select
              id="projection-selection"
              value={selectionValue}
              onChange={(event) => select(event.target.value)}
              className={`mt-1.5 ${fieldClassName} ${borderClassName(false)}`}
            >
              {hasInvestment && <option value={PORTFOLIO}>Portafolio de inversión completo</option>}
              {options.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  {account.name} ({account.type === 'savings' ? 'ahorro' : 'inversión'})
                </option>
              ))}
            </select>
          </div>
          {source && (
            <div className="mt-4" aria-live="polite">
              <p className="text-[0.9rem] text-ink-2">Valor actual de la selección</p>
              <p className="text-[1.6rem] font-semibold tabular-nums">{formatMoney(source.value)}</p>
              <Provenance source={source} />
            </div>
          )}
        </Card>

        {drafts.map((draft, position) => (
          <ScenarioForm
            key={position}
            position={position}
            draft={draft}
            errors={errors}
            placeholder={source ? source.value : '0.00'}
            savedRate={savedRate}
            removable={drafts.length > 1}
            onChange={(patch) => change(position, patch)}
            onRemove={() => setDrafts((current) => current.filter((_, index) => index !== position))}
          />
        ))}

        {fieldErrors.length > 0 && <FormAlert>{fieldErrors.join(' ')}</FormAlert>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={calculating} className={`${primaryButtonClassName} sm:max-w-[16rem]`}>
            {calculating ? 'Calculando…' : 'Proyectar'}
          </button>
          {drafts.length < SCENARIO_LIMIT && (
            <button
              type="button"
              onClick={() => setDrafts((current) => [...current, defaultDraft()])}
              className={smallSecondaryButtonClassName}
            >
              <Plus size={17} aria-hidden="true" />
              Agregar escenario
            </button>
          )}
        </div>
      </form>

      <div className="min-w-0 space-y-4 lg:col-span-5 lg:space-y-5">
        {result && (
          <>
            {result.scenarios.map((scenario, position) => (
              <ResultCard key={position} position={position} scenario={scenario} />
            ))}
            <Card id="evolution" title="Evolución mensual">
              <div className="mt-3">
                <ProjectionChart scenarios={result.scenarios} />
                <MonthlyTable scenarios={result.scenarios} />
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

/** Hypothetical scenarios of savings and investments; both routes open the same comparator. */
export function Projection() {
  const startsFromSavings = useLocation().pathname.startsWith('/savings')
  const { state, retry } = useAccounts()

  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title="Proyección" intro={intro} />
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      </>
    )
  }

  const projectable = state.value.filter((account) => !account.archivedAt && account.type !== 'spending')
  if (projectable.length === 0) {
    return (
      <>
        <ScreenHeader title="Proyección" intro={intro} />
        <EmptyState
          icon={Calculator}
          title="Aún no tienes una Cuenta para proyectar"
          text="La Proyección parte del Saldo de una Cuenta de ahorro o del valor de una Cuenta de inversión. Crea una para empezar."
          action={{ to: '/accounts/create', label: 'Crear cuenta' }}
        />
      </>
    )
  }

  const firstSavings = projectable.find((account) => account.type === 'savings')
  const hasInvestment = projectable.some((account) => account.type === 'investment')
  const initialSelection =
    startsFromSavings && firstSavings
      ? `account:${firstSavings.id}`
      : hasInvestment
        ? PORTFOLIO
        : `account:${projectable[0].id}`

  return (
    <>
      <ScreenHeader title="Proyección" intro={intro} />
      <Comparator accounts={projectable} initialSelection={initialSelection} />
    </>
  )
}
