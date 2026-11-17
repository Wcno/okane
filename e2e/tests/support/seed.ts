import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { request } from '@playwright/test'
import {
  archiveCategory,
  createAccount,
  createBudget,
  createCategory,
  createExpense,
  createIncome,
  createRecurringPayment,
  createToken,
  createTransfer,
  findAsset,
  recordTrade,
  savePreferences,
  setReferencePrice,
  type InitialCategory,
} from './ledger.ts'
import { signUp, uniqueEmail } from './session.ts'

/**
 * Seeds a fresh, realistic User through the app's own HTTP API, for the final pass in a browser.
 * Every run creates a new User; the credentials go to the gitignored e2e/.qa-user.json and the
 * password and the token secret are never printed.
 */
const credentialsFile = fileURLToPath(new URL('../../.qa-user.json', import.meta.url))
const MONTHS_BACK = 3
const EXPENSE_EVERY_DAYS = 2
const DESCRIPTIONS = ['Supermercado', 'Taxi', 'Farmacia', 'Cine', 'Luz', 'Almuerzo', 'Libros', 'Gasolina', 'Café']
const CATEGORIES: InitialCategory[] = ['food', 'transport', 'health', 'entertainment', 'utilities', 'education', 'other']

/** A calendar day in America/Panama, `daysAgo` days before today, as YYYY-MM-DD. */
function panamaDay(daysAgo: number) {
  const day = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(day)
}

const monthOf = (day: string) => day.slice(0, 7)

/** The month before `month` (YYYY-MM). */
function previousMonth(month: string) {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 2
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Amounts from 3.25 to 87.00, deterministic so reruns show the same shapes. */
function amountFor(index: number) {
  const cents = 325 + ((index * 1373) % 8376)
  return (cents / 100).toFixed(2)
}

const context = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000' })
const email = uniqueEmail().replace('e2e-', 'qa-')
const password = randomBytes(18).toString('base64url')
await signUp(context, email, password)

const openingDate = panamaDay(MONTHS_BACK * 31 + 10)
const spending = await createAccount(context, { name: 'Cuenta corriente', opening_balance: '2500.00', opening_date: openingDate })
const savings = await createAccount(context, {
  name: 'Ahorro',
  type: 'savings',
  opening_balance: '6000.00',
  opening_date: openingDate,
  annual_interest_rate: '0.0425',
})
const broker = await createAccount(context, { name: 'Bróker', type: 'investment', opening_balance: '0.00', opening_date: openingDate })

// Categories: the initial ones, one of the User's own and one that was archived.
const gym = await createCategory(context, 'Gimnasio')
const old = await createCategory(context, 'Suscripciones viejas')
await createExpense(context, { account_id: spending.id, amount: '15.00', category_id: old.id, date: panamaDay(40), description: 'Revista' })
await archiveCategory(context, old.id)

// About three months of Expenses over several Categories, and an Income each month.
let expenses = 0
for (let daysAgo = 1; daysAgo <= MONTHS_BACK * 30; daysAgo += EXPENSE_EVERY_DAYS) {
  const index = expenses++
  await createExpense(context, {
    account_id: index % 6 === 0 ? savings.id : spending.id,
    amount: amountFor(index),
    category: CATEGORIES[index % CATEGORIES.length],
    date: panamaDay(daysAgo),
    description: DESCRIPTIONS[index % DESCRIPTIONS.length],
  })
  if (index % 11 === 0) {
    await createExpense(context, { account_id: spending.id, amount: '35.00', category_id: gym.id, date: panamaDay(daysAgo), description: 'Mensualidad' })
    expenses++
  }
}
let incomes = 0
for (let month = 0; month < MONTHS_BACK; month++) {
  await createIncome(context, { account_id: spending.id, amount: '1800.00', date: panamaDay(month * 30 + 3), description: 'Sueldo' })
  incomes++
}
await createIncome(context, { account_id: savings.id, amount: '120.00', date: panamaDay(20), description: 'Intereses y regalo' })
incomes++

// Two Transfers: to Savings, and a Contribution to the investment Account.
await createTransfer(context, { source_account_id: spending.id, destination_account_id: savings.id, amount: '300.00', date: panamaDay(45), description: 'Ahorro del mes' })
await createTransfer(context, { source_account_id: spending.id, destination_account_id: broker.id, amount: '1500.00', date: panamaDay(60), description: 'Aporte al bróker' })

// Budgets for this month and the previous one; Alimentación is exceeded this month.
const thisMonth = monthOf(panamaDay(0))
await createBudget(context, { month: thisMonth, category: 'food', amount: '20.00' })
await createBudget(context, { month: thisMonth, category: 'transport', amount: '400.00' })
await createBudget(context, { month: previousMonth(thisMonth), category: 'food', amount: '300.00' })
await createBudget(context, { month: previousMonth(thisMonth), category: 'entertainment', amount: '150.00' })

// Recurring payments: one held back since last month (an overdue occurrence), one at month end (pending).
await createRecurringPayment(context, {
  account_id: spending.id,
  start_date: `${previousMonth(thisMonth)}-01`,
  day_of_month: 1,
  amount: '650.00',
  category: 'housing',
  description: 'Alquiler',
})
await createRecurringPayment(context, {
  account_id: spending.id,
  start_date: `${thisMonth}-01`,
  day_of_month: 31,
  amount: '45.00',
  category: 'utilities',
  description: 'Internet',
})

// Investments from the sample catalog: two buys, a sale with a commission and a dividend, then a User's own price.
const apple = await findAsset(context, 'aapl', 'XNAS')
const microsoft = await findAsset(context, 'msft')
await recordTrade(context, 'buy', { account_id: broker.id, asset_id: apple.id, units: '10', unit_price: '50', commission: '1.00', date: panamaDay(55) })
await recordTrade(context, 'buy', { account_id: broker.id, asset_id: microsoft.id, units: '4', unit_price: '120', date: panamaDay(50) })
await recordTrade(context, 'sell', { account_id: broker.id, asset_id: apple.id, units: '2', unit_price: '58', commission: '1.50', date: panamaDay(25) })
await recordTrade(context, 'dividend', { account_id: broker.id, asset_id: apple.id, amount: '4.20', date: panamaDay(10) })
await setReferencePrice(context, apple.id, '62.50')

// Movements preferences, and one personal token whose secret is never shown.
await savePreferences(context, { period: 'all', grouping: 'type' })
await createToken(context, 'Hoja de cálculo', ['finance:read', 'movements:create'])

await writeFile(credentialsFile, `${JSON.stringify({ email, password }, null, 2)}\n`, { mode: 0o600 })
await context.dispose()
console.log(
  `Seeded ${email}: 3 Accounts, ${expenses + 1} Expenses, ${incomes} Incomes, 2 Transfers, 4 Budgets, 2 recurring payments, ` +
    '4 investment operations, 2 custom Categories (1 archived), preferences and 1 token. Credentials are in e2e/.qa-user.json',
)
