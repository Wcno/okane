import { afterEach, describe, expect, it, vi } from 'vitest'
import { createToken, listTokens, NAME_MAX_LENGTH, revokeToken, validateToken } from './api'

afterEach(() => vi.unstubAllGlobals())

const body = {
  id: 3,
  name: 'Google Sheets',
  prefix: 'a1b2c3d4',
  scopes: ['finance:read'],
  created_at: '2026-11-16T10:00:00Z',
  revoked_at: null,
}

describe('validateToken', () => {
  it('accepts a named token with a permission', () => {
    expect(validateToken({ name: ' Script ', scopes: ['finance:read'] })).toBeNull()
  })

  it('asks for a name and a permission', () => {
    const errors = validateToken({ name: '   ', scopes: [] })

    expect(errors?.name?.[0]).toContain('nombre')
    expect(errors?.scopes?.[0]).toContain('permiso')
  })

  it('refuses a name longer than the limit', () => {
    expect(validateToken({ name: 'x'.repeat(NAME_MAX_LENGTH + 1), scopes: ['finance:read'] })?.name).toBeDefined()
  })
})

describe('tokens api', () => {
  it('lists tokens with camel-case fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [body] }))))

    const [token] = await listTokens()

    expect(token).toEqual({ id: 3, name: 'Google Sheets', prefix: 'a1b2c3d4', scopes: ['finance:read'], createdAt: body.created_at, revokedAt: null })
  })

  it('creates a token with the CSRF header and returns the secret once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: body, secret: 'okt_a1b2c3d4_secret' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await createToken({ name: ' Google Sheets ', scopes: ['finance:read'] }, 'csrf')

    expect(outcome.ok && outcome.value.secret).toBe('okt_a1b2c3d4_secret')
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/users/me/tokens')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({ name: 'Google Sheets', scopes: ['finance:read'] })
  })

  it('reports the errors of a refused token by field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: { name: ['Mal'] } }), { status: 400 })))

    const outcome = await createToken({ name: 'x', scopes: ['finance:read'] }, 'csrf')

    expect(!outcome.ok && outcome.errors.name).toEqual(['Mal'])
  })

  it('revokes a token with DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await revokeToken(3, 'csrf')

    expect(outcome.ok).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('/users/me/tokens/3')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })
})
