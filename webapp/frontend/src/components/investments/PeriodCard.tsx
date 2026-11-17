import { useState } from 'react'
import { getPerformance } from '../../investments/portfolio'
import { formatDay, isCalendarDay, todayInPanama } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { useLoaded } from '../../lib/useLoaded'
import { Card } from '../dashboard/Card'
import { Pending } from '../screen/Screen'
import { TextField } from '../TextField'
import { Figure, ReturnLine } from './Figures'

const firstDayOfMonth = () => `${todayInPanama().slice(0, 8)}01`

function Period({ from }: { from: string }) {
  const { state, retry } = useLoaded(async () => (await getPerformance(from)).period, from)

  if (state.status !== 'ready') return <Pending state={state} retry={retry} loading="Calculando el período…" />
  const period = state.value
  if (period === null) return null

  return (
    <>
      <div className="mt-4">
        <ReturnLine value={{ amount: period.return, percent: null }} suffix={`del ${formatDay(period.from)} al ${formatDay(period.to)}`} />
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Figure label="Acumulado al cierre" hint={`Al final del ${formatDay(period.to)}`}>
          {formatMoney(period.closingReturn)}
        </Figure>
        <Figure label="Acumulado al inicio" hint="Al final del día anterior al período">
          {formatMoney(period.openingReturn)}
        </Figure>
      </dl>
    </>
  )
}

/**
 * The Return of a period is the cumulative Return at its close minus the one at its start,
 * so an Aporte made during the period is not counted as Return.
 */
export function PeriodCard() {
  const [from, setFrom] = useState(firstDayOfMonth)
  const today = todayInPanama()
  const valid = isCalendarDay(from) && from <= today

  return (
    <Card id="period-return" title="Rendimiento del período">
      <div className="mt-3 max-w-[16rem]">
        <TextField
          id="period-from"
          label="Desde"
          type="date"
          max={today}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          errors={valid ? undefined : ['Elige un día que no sea futuro.']}
        />
      </div>
      {valid && <Period from={from} />}
    </Card>
  )
}
