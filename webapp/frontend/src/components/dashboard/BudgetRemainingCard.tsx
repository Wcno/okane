import { CircleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { categoryByName } from '../../data/categories'
import {
  committedByCategory,
  monthlyExpenses,
  remainingBudget,
  sum,
  type BudgetLine,
} from '../../data/sample'
import { formatMoney } from '../../lib/money'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'
import { useData } from '../../state/context'
import { Card } from './Card'

function BudgetMeter({ line, committed }: { line: BudgetLine; committed: number }) {
  const budget = line.budget ?? 0
  const used = line.spent + committed

  // When over budget, the bar represents total usage and highlights
  // the portion exceeding the Budget with the critical status color.
  if (budget > 0 && used > budget) {
    const withinBudget = (budget / used) * 100
    return (
      <div
        className="mt-2.5 flex h-2 gap-0.5"
        role="img"
        aria-label={`Presupuesto excedido en ${Math.round(100 - withinBudget)}% de lo usado.`}
      >
        <span
          className="rounded-full bg-(--tone) transition-[width] duration-500 ease-out-quart"
          style={{ width: `${withinBudget}%` }}
        />
        <span className="flex-1 rounded-full bg-critical" />
      </div>
    )
  }

  const spent = budget > 0 ? (line.spent / budget) * 100 : 0
  const reserved = budget > 0 ? (committed / budget) * 100 : 0

  return (
    <div
      className="mt-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tone)_17%,var(--surface))]"
      role="img"
      aria-label={`Gastado ${Math.round(spent)}% del Presupuesto${
        committed > 0 ? `, comprometido ${Math.round(reserved)}%` : ''
      }.`}
    >
      {spent > 0 && (
        <span
          className="rounded-full bg-(--tone) transition-[width] duration-500 ease-out-quart"
          style={{ width: `${spent}%` }}
        />
      )}
      {reserved > 0 && (
        <span
          className="rounded-full bg-[color-mix(in_oklab,var(--tone)_48%,var(--surface))] transition-[width] duration-500 ease-out-quart"
          style={{ width: `${reserved}%` }}
        />
      )}
    </div>
  )
}

function Row({ line }: { line: BudgetLine }) {
  const category = categoryByName(line.category)
  const Icon = category.icon
  const committed = committedByCategory(line.category)
  const value = remainingBudget(line)
  const displayed = useAnimatedNumber(value ?? 0)
  const overBudget = value !== null && value < 0

  return (
    <li
      style={{ '--tone': category.tone } as CSSProperties}
      className="-mx-2 flex items-start gap-3.5 rounded-2xl px-2 py-3"
    >
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_15%,transparent)] text-(--tone)">
        <Icon size={19} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[1rem] font-medium">{line.category}</h3>
          {value === null ? (
            <span className="shrink-0 text-[0.9rem] text-ink-3">Sin Presupuesto</span>
          ) : (
            <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(displayed)}</span>
          )}
        </div>

        {value !== null && <BudgetMeter line={line} committed={committed} />}

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[0.87rem] text-ink-3">
          <span className="tabular-nums">
            {line.budget === null
              ? `Gastado ${formatMoney(line.spent)}`
              : `Gastado ${formatMoney(line.spent)} de ${formatMoney(line.budget)}`}
          </span>
          {overBudget ? (
            <span className="inline-flex items-center gap-1 font-medium text-critical">
              <CircleAlert size={14} aria-hidden="true" />
              Excedida
            </span>
          ) : (
            committed > 0 && <span className="tabular-nums">Comprometido {formatMoney(committed)}</span>
          )}
        </div>
      </div>
    </li>
  )
}

/** Remaining Budget per Category, including committed payments. */
export function BudgetRemainingCard() {
  const { state } = useData()
  const budgeted = sum(state.budgets.map((line) => line.budget ?? 0))

  return (
    <Card
      id="remaining"
      title="Restante por Categoría"
      link={{ to: '/budgets', text: 'Presupuestos' }}
    >
      <p className="mt-1 text-[0.95rem] text-ink-3">
        Gastado {formatMoney(monthlyExpenses(state))} de {formatMoney(budgeted)} presupuestados
      </p>
      <ul className="mt-3">
        {state.budgets.map((line) => (
          <Row key={line.category} line={line} />
        ))}
      </ul>
    </Card>
  )
}
