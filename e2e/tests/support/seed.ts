import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { request } from '@playwright/test'
import { createAccount, createExpense } from './ledger.ts'
import { signUp, uniqueEmail } from './session.ts'

const credentialsFile = fileURLToPath(new URL('../../.qa-user.json', import.meta.url))
const DAYS = 10
const EXPENSES_PER_DAY = 6
const DESCRIPTIONS = ['Supermercado', 'Taxi', 'Farmacia', 'Cine', 'Luz', 'Almuerzo', 'Libros', 'Alquiler', 'Gasolina', 'Café']
const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'health', 'entertainment', 'education', 'other'] as const

/** A calendar day in America/Panama, `daysAgo` days before today, as YYYY-MM-DD. */
function panamaDay(daysAgo: number) {
  const day = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(day)
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

const openingDate = panamaDay(DAYS + 20)
const spending = await createAccount(context, { name: 'Cuenta corriente', opening_balance: '2500.00', opening_date: openingDate })
const savings = await createAccount(context, { name: 'Ahorro', type: 'savings', opening_balance: '8000.00', opening_date: openingDate })

for (let day = 0; day < DAYS; day++) {
  for (let slot = 0; slot < EXPENSES_PER_DAY; slot++) {
    const index = day * EXPENSES_PER_DAY + slot
    await createExpense(context, {
      account_id: index % 5 === 0 ? savings.id : spending.id,
      amount: amountFor(index),
      category: CATEGORIES[index % CATEGORIES.length],
      date: panamaDay(day),
      description: DESCRIPTIONS[index % DESCRIPTIONS.length],
    })
  }
}

await writeFile(credentialsFile, `${JSON.stringify({ email, password }, null, 2)}\n`, { mode: 0o600 })
await context.dispose()
console.log(`Seeded ${DAYS * EXPENSES_PER_DAY} Expenses in 2 Accounts for ${email}`)
console.log('Credentials are in e2e/.qa-user.json')
