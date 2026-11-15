import { describe, expect, it } from 'vitest'
import {
  committed,
  expenseAccounts,
  disponible,
  initialState,
  netWorthHistory,
  netWorth,
  recordExpense,
  remainingBudget,
  spendingAccountBalance,
  type DemoState,
} from './sample'

const budgetLineFor = (state: DemoState, category: string) => {
  const line = state.budgets.find((candidate) => candidate.category === category)
  if (!line) throw new Error(`No budget line for ${category}`)
  return line
}

const accountBalanceFor = (state: DemoState, accountId: string) => {
  const account = state.accounts.find((candidate) => candidate.id === accountId)
  if (!account) throw new Error(`Unknown account ${accountId}`)
  return account.balance
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

describe('recording an Expense', () => {
  const expense = { amount: 12.5, category: 'Alimentación', accountId: 'checking' }
  const after = recordExpense(initialState, expense)

  it('reduces the selected Account balance and preserves the others', () => {
    expect(accountBalanceFor(after, 'checking')).toBe(1272.1)
    expect(accountBalanceFor(after, 'credit-card')).toBe(accountBalanceFor(initialState, 'credit-card'))
    expect(accountBalanceFor(after, 'savings')).toBe(accountBalanceFor(initialState, 'savings'))
  })

  it('reduces available funds and the Category remaining amount equally', () => {
    expect(disponible(after)).toBe(759.4)
    expect(remainingBudget(budgetLineFor(after, 'Alimentación'))).toBe(93.15)
    expect(remainingBudget(budgetLineFor(after, 'Transporte'))).toBe(4.3)
  })

  it('accepts an Expense that exceeds the Budget or creates a negative balance', () => {
    const largeExpense = recordExpense(initialState, { ...expense, amount: 2000 })
    expect(remainingBudget(budgetLineFor(largeExpense, 'Alimentación'))).toBe(-1894.35)
    expect(accountBalanceFor(largeExpense, 'checking')).toBe(-715.4)
  })

  it('preserves the previous state', () => {
    expect(accountBalanceFor(initialState, 'checking')).toBe(1284.6)
    expect(budgetLineFor(initialState, 'Alimentación').spent).toBe(214.35)
  })

  it('excludes investment Accounts from Expense entry', () => {
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

  it('an Expense reduces monthly Net Savings without changing Investment Return', () => {
    const before = netWorthHistory(initialState).at(-1)!
    const after = netWorthHistory(
      recordExpense(initialState, { amount: 40, category: 'Salud', accountId: 'checking' }),
    ).at(-1)!
    expect(after.netSavings).toBeCloseTo(before.netSavings - 40, 2)
    expect(after.investmentReturn).toBeCloseTo(before.investmentReturn, 2)
    expect(after.netWorth).toBeCloseTo(before.netWorth - 40, 2)
  })
})
