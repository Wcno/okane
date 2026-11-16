import { afterEach, describe, expect, it, vi } from 'vitest'
import { changePassword, fetchSession, requestPasswordReset, resetPassword, submitCredentials } from './api'

function answer(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  )
}

const credentials = { email: 'ana@ejemplo.com', password: 'correct-horse-battery' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchSession', () => {
  it('reads the user and the CSRF token', async () => {
    vi.stubGlobal('fetch', answer(200, { user: { id: 1, email: 'ana@ejemplo.com' }, csrf_token: 't1' }))

    await expect(fetchSession()).resolves.toEqual({ user: { id: 1, email: 'ana@ejemplo.com' }, csrfToken: 't1' })
  })
})

describe('submitCredentials', () => {
  it('sends the credentials as JSON with the CSRF token and returns the new session', async () => {
    const fetch = answer(200, { user: { id: 1, email: 'ana@ejemplo.com' }, csrf_token: 'rotated' })
    vi.stubGlobal('fetch', fetch)

    const outcome = await submitCredentials('login', credentials, 't1')

    expect(outcome).toEqual({ ok: true, session: { user: { id: 1, email: 'ana@ejemplo.com' }, csrfToken: 'rotated' } })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/auth/login')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('t1')
    expect(JSON.parse(init.body)).toEqual(credentials)
  })

  it('returns the field errors of a rejected registration', async () => {
    vi.stubGlobal('fetch', answer(400, { errors: { email: ['Ya existe un usuario con este correo.'] } }))

    await expect(submitCredentials('register', credentials, 't1')).resolves.toEqual({
      ok: false,
      errors: { email: ['Ya existe un usuario con este correo.'] },
    })
  })

  it('returns the form error of a limited login', async () => {
    vi.stubGlobal('fetch', answer(429, { errors: { form: ['Hubo demasiados intentos fallidos.'] } }, { 'Retry-After': '600' }))

    await expect(submitCredentials('login', credentials, 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['Hubo demasiados intentos fallidos.'] },
    })
  })

  it('explains a server failure without error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 })))

    await expect(submitCredentials('login', credentials, 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['Okane no pudo responder. Espera un momento e inténtalo de nuevo.'] },
    })
  })

  it('explains a lost connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(submitCredentials('login', credentials, 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'] },
    })
  })
})

describe('requestPasswordReset', () => {
  it('sends the email and succeeds without a body', async () => {
    const fetch = answer(204)
    vi.stubGlobal('fetch', fetch)

    await expect(requestPasswordReset('ana@ejemplo.com', 't1')).resolves.toEqual({ ok: true })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/auth/forgot-password')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('t1')
    expect(JSON.parse(init.body)).toEqual({ email: 'ana@ejemplo.com' })
  })

  it('returns the form error of a limited request', async () => {
    vi.stubGlobal('fetch', answer(429, { errors: { form: ['Hubo demasiadas solicitudes seguidas.'] } }))

    await expect(requestPasswordReset('ana@ejemplo.com', 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['Hubo demasiadas solicitudes seguidas.'] },
    })
  })
})

describe('resetPassword', () => {
  it('sends the token of the link with the new password and returns the session', async () => {
    const fetch = answer(200, { user: null, csrf_token: 't2' })
    vi.stubGlobal('fetch', fetch)

    await expect(resetPassword('7-abc-def', 'staple-battery-horse', 't1')).resolves.toEqual({
      ok: true,
      session: { user: null, csrfToken: 't2' },
    })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/auth/reset-password')
    expect(JSON.parse(init.body)).toEqual({ token: '7-abc-def', password: 'staple-battery-horse' })
  })

  it('returns the error of a link that no longer works', async () => {
    vi.stubGlobal('fetch', answer(400, { errors: { form: ['Este enlace ya no sirve.'] } }))

    await expect(resetPassword('7-abc-def', 'staple-battery-horse', 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['Este enlace ya no sirve.'] },
    })
  })
})

describe('changePassword', () => {
  const change = { currentPassword: 'correct-horse-battery', newPassword: 'staple-battery-horse' }

  it('sends both passwords with PUT and returns the session', async () => {
    const fetch = answer(200, { user: { id: 1, email: 'ana@ejemplo.com' }, csrf_token: 't2' })
    vi.stubGlobal('fetch', fetch)

    await expect(changePassword(change, 't1')).resolves.toEqual({
      ok: true,
      session: { user: { id: 1, email: 'ana@ejemplo.com' }, csrfToken: 't2' },
    })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/auth/password')
    expect(init.method).toBe('PUT')
    expect(init.headers['X-CSRFToken']).toBe('t1')
    expect(JSON.parse(init.body)).toEqual({
      current_password: 'correct-horse-battery',
      new_password: 'staple-battery-horse',
    })
  })

  it('names the fields of the form in its errors', async () => {
    vi.stubGlobal(
      'fetch',
      answer(400, { errors: { current_password: ['No coincide.'], new_password: ['Es muy común.'] } }),
    )

    await expect(changePassword(change, 't1')).resolves.toEqual({
      ok: false,
      errors: { currentPassword: ['No coincide.'], newPassword: ['Es muy común.'] },
    })
  })

  it('says that the session ended when webapp no longer knows the user', async () => {
    vi.stubGlobal('fetch', answer(401, { detail: 'authentication_required' }))

    await expect(changePassword(change, 't1')).resolves.toEqual({
      ok: false,
      errors: { form: ['Tu sesión se cerró. Inicia sesión de nuevo para cambiar tu contraseña.'] },
    })
  })
})
