import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { createBudget, deleteBudget, getBudget, getBudgetMonth, hasBudget, updateBudget } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = {
  id: 4,
  category_id: 2,
  month: '2026-11',
  amount: '300.00',
  spent: '80.00',
  committed: '100.00',
  carried_over: '40.00',
  remaining: '120.00',
  exceeded: false,
}

const withoutBudget = { ...received, id: null, amount: null, remaining: null, category_id: 3, spent: '15.00' }

const budget = {
  id: 4,
  categoryId: 2,
  month: '2026-11',
  amount: '300.00',
  spent: '80.00',
  committed: '100.00',
  carriedOver: '40.00',
  remaining: '120.00',
  exceeded: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getBudgetMonth', () => {
  it('reads one line per Category, with or without a Budget', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { month: '2026-11', results: [received, withoutBudget] }))
    vi.stubGlobal('fetch', fetch)

    const month = await getBudgetMonth('2026-11')

    expect(fetch.mock.calls[0][0]).toBe('/api/budgets?month=2026-11')
    expect(month.lines[0]).toEqual(budget)
    expect(month.lines.map(hasBudget)).toEqual([true, false])
    expect(month.lines[1]).toMatchObject({ id: null, amount: null, remaining: null, spent: '15.00' })
  })
})

describe('getBudget', () => {
  it('throws NotFoundError for a Budget that is not the User', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'Not found.' })))
    await expect(getBudget(9)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('createBudget', () => {
  it('sends the snake case body with the CSRF token and returns the Budget', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, received))
    vi.stubGlobal('fetch', fetch)

    const outcome = await createBudget({ categoryId: 2, month: '2026-11', amount: '300.00' }, 'csrf')

    expect(outcome).toEqual({ ok: true, value: budget })
    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/budgets')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({ category_id: 2, month: '2026-11', amount: '300.00' })
  })

  it('shows the conflict of a second Budget for the Category and month as a form error', async () => {
    const message = 'Esta Categoría ya tiene un presupuesto en ese mes. Edita el existente.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { errors: { form: [message] } })))

    const outcome = await createBudget({ categoryId: 2, month: '2026-11', amount: '300.00' }, 'csrf')

    expect(outcome).toEqual({ ok: false, sessionEnded: false, errors: { form: [message] } })
  })

  it('puts field errors on the fields of the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(400, { errors: { category_id: ['Elige la Categoría del presupuesto.'] } })),
    )

    const outcome = await createBudget({ categoryId: 2, month: '2026-11', amount: '300.00' }, 'csrf')

    expect(outcome).toMatchObject({ ok: false, errors: { categoryId: ['Elige la Categoría del presupuesto.'] } })
  })
})

describe('updateBudget and deleteBudget', () => {
  it('replaces the whole Budget', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await updateBudget(4, { categoryId: 2, month: '2026-10', amount: '250.00' }, 'csrf')

    expect(fetch.mock.calls[0][0]).toBe('/api/budgets/4')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('deletes by id', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    expect(await deleteBudget(4, 'csrf')).toEqual({ ok: true, value: undefined })
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
  })
})
