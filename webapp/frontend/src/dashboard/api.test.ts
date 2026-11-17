import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestError, SessionEndedError } from '../lib/http'
import { getDashboard } from './api'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const body = {
  month: '2026-11',
  days_left: 15,
  available: '550.00',
  spending_balance: '750.00',
  committed: '200.00',
  committed_count: 1,
  per_day: '36.66',
  net_worth: '1250.00',
  income: '100.00',
  expenses: '30.00',
  net_savings: '70.00',
  budgets: [
    {
      id: 3,
      category_id: 2,
      month: '2026-11',
      amount: '300.00',
      spent: '40.00',
      committed: '0.00',
      carried_over: '0.00',
      remaining: '260.00',
      exceeded: false,
    },
  ],
  overdue: [],
  upcoming: [
    {
      id: 9,
      recurring_payment_id: 4,
      due_date: '2026-11-20',
      status: 'pending',
      amount: '200.00',
      account_id: 1,
      category_id: 4,
      description: 'Internet',
      reserved_from: '2026-11-01',
      resolved_on: null,
      resolved_at: null,
      expense_id: null,
    },
  ],
  accounts: [{ id: 1, name: 'Cuenta corriente', type: 'spending', balance: '750.00', archived: false }],
}

afterEach(() => vi.unstubAllGlobals())

describe('getDashboard', () => {
  it('keeps every amount a decimal string and names the fields for the screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, body)))

    const dashboard = await getDashboard()

    expect(dashboard).toMatchObject({
      month: '2026-11',
      daysLeft: 15,
      available: '550.00',
      spendingBalance: '750.00',
      committedCount: 1,
      perDay: '36.66',
      netWorth: '1250.00',
      netSavings: '70.00',
    })
    expect(dashboard.budgets[0]).toMatchObject({ id: 3, categoryId: 2, remaining: '260.00' })
    expect(dashboard.upcoming[0]).toMatchObject({ id: 9, dueDate: '2026-11-20', categoryId: 4 })
    expect(dashboard.accounts[0].balance).toBe('750.00')
    expect(fetch).toHaveBeenCalledWith('/api/dashboard', expect.anything())
  })

  it('ends the session when webapp says nobody is signed in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401)))

    await expect(getDashboard()).rejects.toBeInstanceOf(SessionEndedError)
  })

  it('says the Panel could not be read when api-service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(502)))

    await expect(getDashboard()).rejects.toBeInstanceOf(RequestError)
  })
})
