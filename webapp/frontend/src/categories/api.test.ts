import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { archiveCategory, createCategory, getCategory, listCategories, renameCategory } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = { id: 9, name: 'Mascotas', is_custom: true, archived_at: null }
const category = { id: 9, name: 'Mascotas', isCustom: true, archivedAt: null }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('categories api', () => {
  it('lists every Category, archived ones included', async () => {
    const archived = { ...received, id: 10, archived_at: '2026-11-16T10:00:00Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { results: [received, archived] })))

    const categories = await listCategories()

    expect(categories).toEqual([category, { ...category, id: 10, archivedAt: '2026-11-16T10:00:00Z' }])
  })

  it('reads one Category and says when it is gone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(200, received)).mockResolvedValueOnce(json(404)))

    expect(await getCategory(9)).toEqual(category)
    await expect(getCategory(9)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('creates, renames and archives with the CSRF token', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(200, received)))
    vi.stubGlobal('fetch', fetch)

    await createCategory({ name: 'Mascotas' }, 'token')
    await renameCategory(9, { name: 'Mis mascotas' }, 'token')
    await archiveCategory(9, 'token')

    expect(fetch.mock.calls.map(([path, init]) => [init.method, path, init.headers['X-CSRFToken']])).toEqual([
      ['POST', '/api/categories', 'token'],
      ['PUT', '/api/categories/9', 'token'],
      ['POST', '/api/categories/9/archive', 'token'],
    ])
  })

  it('returns what api-service says when archiving is refused', async () => {
    const message = 'Mueve o elimina los pagos recurrentes de esta Categoría antes de archivarla.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { errors: { form: [message] } })))

    const outcome = await archiveCategory(9, 'token')

    expect(outcome).toMatchObject({ ok: false, errors: { form: [message] } })
  })

  it('puts the name error on the name field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, { errors: { name: ['Ya tienes una Categoría con ese nombre.'] } })))

    const outcome = await createCategory({ name: 'Mascotas' }, 'token')

    expect(outcome).toMatchObject({ ok: false, errors: { name: ['Ya tienes una Categoría con ese nombre.'] } })
  })
})
