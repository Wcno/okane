// Demo fixtures used while api-service has not been implemented.
// Derived amounts are calculated from these fixtures rather than entered manually.
// Available funds, Remaining Budgets and Net Worth follow the glossary rules
// so that the demonstration amounts remain internally consistent.

export type AccountType = 'spending' | 'savings' | 'investment'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
}

export interface Position {
  symbol: string
  name: string
  units: number
  referencePrice: number
}

export interface RecurringPayment {
  id: string
  name: string
  category: string
  amount: number
  day: number
}

export interface BudgetLine {
  category: string
  /** Null means this Category has no Budget for the month. */
  budget: number | null
  spent: number
}

export interface NetWorthPoint {
  month: string
  netWorth: number
  netSavings: number
  investmentReturn: number
}

/** Only these fields change when recording a demo Expense; the other fixtures are fixed. */
export interface DemoState {
  accounts: Account[]
  budgets: BudgetLine[]
}

export const today = { day: 15, month: 'noviembre', shortMonth: 'nov', year: 2026, daysInMonth: 30 }

export const initialState: DemoState = {
  accounts: [
    { id: 'checking', name: 'Cuenta corriente', type: 'spending', balance: 1284.6 },
    { id: 'credit-card', name: 'Tarjeta de crédito', type: 'spending', balance: -312.45 },
    { id: 'savings', name: 'Ahorro', type: 'savings', balance: 4150 },
    { id: 'broker', name: 'Bróker', type: 'investment', balance: 186.2 },
  ],
  budgets: [
    { category: 'Vivienda', budget: 650, spent: 650 },
    { category: 'Alimentación', budget: 320, spent: 214.35 },
    { category: 'Transporte', budget: 140, spent: 71.2 },
    { category: 'Servicios', budget: 130, spent: 18.9 },
    { category: 'Salud', budget: 80, spent: 12 },
    { category: 'Entretenimiento', budget: 90, spent: 118.4 },
    { category: 'Educación', budget: 60, spent: 0 },
    { category: 'Otros', budget: null, spent: 23.5 },
  ],
}

export const positions: Position[] = [
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', units: 6.5, referencePrice: 512.4 },
  { symbol: 'BTC', name: 'Bitcoin', units: 0.042, referencePrice: 68450 },
]

export const recurringPayments: RecurringPayment[] = [
  { id: 'rent', name: 'Alquiler', category: 'Vivienda', amount: 650, day: 1 },
  { id: 'internet', name: 'Internet', category: 'Servicios', amount: 42.75, day: 18 },
  { id: 'electricity', name: 'Luz', category: 'Servicios', amount: 58, day: 22 },
  { id: 'gym', name: 'Gimnasio', category: 'Salud', amount: 35, day: 25 },
  { id: 'insurance', name: 'Seguro del auto', category: 'Transporte', amount: 64.5, day: 28 },
]

export const monthlyIncome = 1650

/** Net Worth at the May close; each subsequent month adds Net Savings and Investment Return. */
const closingNetWorthInMay = 9120.4

const closedMonths = [
  { month: 'jun', netSavings: 380, investmentReturn: 74.7 },
  { month: 'jul', netSavings: 410.2, investmentReturn: -94.55 },
  { month: 'ago', netSavings: 362.4, investmentReturn: 149.15 },
  { month: 'sep', netSavings: 295.1, investmentReturn: 62.5 },
  { month: 'oct', netSavings: 318.45, investmentReturn: -41.2 },
]

export const sum = (values: number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100

export const remainingDays = today.daysInMonth - today.day

export const upcomingPayments = recurringPayments.filter((payment) => payment.day > today.day)

/** Committed amount: monthly Recurring Payments that are not yet due. */
export const committed = sum(upcomingPayments.map((payment) => payment.amount))

export const committedByCategory = (category: string) =>
  sum(upcomingPayments.filter((payment) => payment.category === category).map((payment) => payment.amount))

export const spendingAccountBalance = (state: DemoState) =>
  sum(state.accounts.filter((account) => account.type === 'spending').map((account) => account.balance))

/** Available funds: spending Account balances minus committed payments. */
export const disponible = (state: DemoState) => sum([spendingAccountBalance(state), -committed])

/** Remaining Budget: Budget less spending and committed payments for the Category. */
export const remainingBudget = (line: BudgetLine) =>
  line.budget === null
    ? null
    : sum([line.budget, -line.spent, -committedByCategory(line.category)])

export const monthlyExpenses = (state: DemoState) =>
  sum(state.budgets.map((line) => line.spent))

export const positionValue = (position: Position) =>
  Math.round(position.units * position.referencePrice * 100) / 100

export const positionsValue = sum(positions.map(positionValue))

/** Net Worth: all Account balances plus all Position values. */
export const netWorth = (state: DemoState) =>
  sum([...state.accounts.map((account) => account.balance), positionsValue])

/** Monthly Net Worth series from the May close through today. */
export const netWorthHistory = (state: DemoState): NetWorthPoint[] => {
  const series: NetWorthPoint[] = [
    { month: 'may', netWorth: closingNetWorthInMay, netSavings: 0, investmentReturn: 0 },
  ]
  for (const month of closedMonths) {
    const previous = series[series.length - 1].netWorth
    series.push({ ...month, netWorth: sum([previous, month.netSavings, month.investmentReturn]) })
  }
  const previousClosing = series[series.length - 1].netWorth
  const currentValue = netWorth(state)
  const netSavings = sum([monthlyIncome, -monthlyExpenses(state)])
  // The demo attributes the part of the change not due to Net Savings to Investment Return.
  const investmentReturn = sum([currentValue, -previousClosing, -netSavings])
  series.push({ month: today.shortMonth, netWorth: currentValue, netSavings, investmentReturn })
  return series
}

/** An Expense can use spending or savings Accounts, never an investment Account. */
export const expenseAccounts = (state: DemoState) =>
  state.accounts.filter((account) => account.type !== 'investment')

export const recordExpense = (
  state: DemoState,
  expense: { amount: number; category: string; accountId: string },
): DemoState => ({
  accounts: state.accounts.map((account) =>
    account.id === expense.accountId ? { ...account, balance: sum([account.balance, -expense.amount]) } : account,
  ),
  budgets: state.budgets.map((line) =>
    line.category === expense.category
      ? { ...line, spent: sum([line.spent, expense.amount]) }
      : line,
  ),
})
