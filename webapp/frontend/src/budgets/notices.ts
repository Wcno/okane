import { categoryById } from '../data/categories'
import { formatMoney } from '../lib/money'
import { monthName } from '../lib/months'
import type { Budget } from './api'

/** What happened to a Budget; the notice says it in Spanish. */
export type BudgetChange = 'created' | 'updated' | 'deleted'

const changeVerbs: Record<BudgetChange, string> = {
  created: 'Creaste',
  updated: 'Guardaste',
  deleted: 'Eliminaste',
}

/** "Creaste un Presupuesto de $300.00 para Alimentación en Noviembre 2026." */
export function budgetNotice(change: BudgetChange, budget: Pick<Budget, 'amount' | 'categoryId' | 'month'>): string {
  const category = categoryById(budget.categoryId).name
  return `${changeVerbs[change]} un Presupuesto de ${formatMoney(budget.amount)} para ${category} en ${monthName(budget.month)}.`
}
