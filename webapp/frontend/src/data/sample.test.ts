import { describe, expect, it } from 'vitest'
import {
  committed,
  expenseAccounts,
  disponible,
  initialState,
  netWorthHistory,
  netWorth,
  remainingBudget,
  spendingAccountBalance,
  type DemoState,
} from './sample'

const budgetLineFor = (state: DemoState, category: string) => {
  const line = state.budgets.find((candidate) => candidate.category === category)
  if (!line) throw new Error(`No budget line for ${category}`)
  return line
}

describe('Available funds', () => {
  it('subtracts committed payments from spending Account balances', () => {
    expect(spendingAccountBalance(initialState)).toBe(972.15)
    expect(committed).toBe(200.25)
    expect(disponible(initialState)).toBe(771.9)
  })

  it('includes the negative balance of a credit card', () => {
    const withoutCreditCard: DemoState = {
      ...initialState,
      accounts: initialState.accounts.filter((account) => account.id !== 'credit-card'),
    }
    expect(disponible(withoutCreditCard) - disponible(initialState)).toBeCloseTo(312.45, 2)
  })

  it('excludes savings and investment Accounts', () => {
    const spendingOnly: DemoState = {
      ...initialState,
      accounts: initialState.accounts.filter((account) => account.type === 'spending'),
    }
    expect(disponible(spendingOnly)).toBe(disponible(initialState))
  })
})

describe('Remaining Budget', () => {
  it('subtracts spending and committed payments for the Category', () => {
    // Budget 140.00, spent 71.20 and insurance payment 64.50 still due.
    expect(remainingBudget(budgetLineFor(initialState, 'Transporte'))).toBe(4.3)
  })

  it('is negative when the Category is over Budget', () => {
    expect(remainingBudget(budgetLineFor(initialState, 'Entretenimiento'))).toBe(-28.4)
  })

  it('does not exist for a Category without a Budget', () => {
    expect(remainingBudget(budgetLineFor(initialState, 'Otros'))).toBeNull()
  })
})

describe('Expense entry', () => {
  it('excludes investment Accounts', () => {
    expect(expenseAccounts(initialState).map((account) => account.type)).not.toContain('investment')
  })
})

describe('Net Worth', () => {
  it('adds all Account balances and Position values', () => {
    expect(netWorth(initialState)).toBe(11513.85)
  })

  it('reconciles the demo monthly change with Net Savings and Investment Return', () => {
    const series = netWorthHistory(initialState)
    for (let index = 1; index < series.length; index += 1) {
      const change = series[index].netWorth - series[index - 1].netWorth
      expect(series[index].netSavings + series[index].investmentReturn).toBeCloseTo(change, 2)
    }
  })
})
