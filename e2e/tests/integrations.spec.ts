import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { createAccount } from './support/ledger.js'
import { signUp } from './support/session.js'

const APPS_SCRIPT = fileURLToPath(new URL('../../docs/examples/google-apps-script/okane.gs', import.meta.url))
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8000'

/** A call the way a script makes it: only the token, no cookie, no CSRF. */
function asScript(secret: string, path: string, init: { method?: string; key?: string; body?: unknown } = {}) {
  return fetch(baseURL + path, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(init.key ? { 'Idempotency-Key': init.key } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
}

async function createTokenInScreen(page: import('@playwright/test').Page, name: string, scopes: string[]) {
  await page.getByLabel('Nombre').fill(name)
  for (const scope of scopes) await page.getByLabel(scope).check()
  await page.getByRole('button', { name: 'Crear token' }).click()
  const secret = page.getByTestId('token-secret')
  await expect(secret).toBeVisible()
  // The one-time secret takes the focus and is in view, also on a phone where it renders below the form.
  await expect(page.getByRole('region', { name: 'Token nuevo' })).toBeFocused()
  await expect(secret).toBeInViewport()
  return (await secret.textContent())!
}

test('a User creates a token, sees its secret once, uses it from a script and revokes it', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/settings/integrations')
  await expect(page.getByRole('heading', { name: 'Integraciones' })).toBeVisible()
  await expect(page.getByText('Todavía no creaste ningún token.')).toBeVisible()
  await expectScreenQuality(page, 'integrations-empty')

  const secret = await createTokenInScreen(page, 'Google Sheets', ['Leer datos financieros', 'Crear Movimientos'])
  expect(secret).toMatch(/^okt_[0-9a-f]{8}_/)
  await expect(page.getByText('no volverá a mostrarse')).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: 'Google Sheets' })
  await expect(row).toContainText(`okt_${secret.split('_')[1]}…`)
  await expect(row).toContainText('Leer datos financieros · Crear Movimientos')
  await expectScreenQuality(page, 'integrations-secret-shown')

  // The secret is readable only now: reloading shows the token without it.
  await page.reload()
  await expect(page.getByTestId('token-secret')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Google Sheets' })).toBeVisible()
  expect(await page.content()).not.toContain(secret)

  expect((await asScript(secret, '/api/v1/accounts')).status).toBe(200)

  await page.getByRole('button', { name: 'Revocar token Google Sheets' }).click()
  await expect(page.getByText('dejarán de funcionar de inmediato')).toBeVisible()
  await expectScreenQuality(page, 'integrations-revoke-confirm')
  await page.getByRole('button', { name: 'Sí, revocar Google Sheets' }).click()

  await expect(page.getByRole('listitem').filter({ hasText: 'Google Sheets' })).toContainText('Revocado el')
  await expect(page.getByRole('button', { name: 'Revocar token Google Sheets' })).toHaveCount(0)
  // A revoked token answering 401 is proven in webapp's tests: calls with invalid tokens count
  // against the address's limit, so a browser suite that repeats them would lock itself out.
})

test('the form asks for a name and a permission before sending', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/settings/integrations')

  await page.getByRole('button', { name: 'Crear token' }).click()

  await expect(page.getByText('Escribe un nombre para reconocer este token')).toBeVisible()
  await expect(page.getByText('Elige al menos un permiso para el token.')).toBeVisible()
  await expect(page.getByLabel('Nombre')).toBeFocused()
  await expectScreenQuality(page, 'integrations-validation')
})

test('the public API checks permissions, validates, and answers a retry with the same record', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { opening_date: '2026-01-01' })
  await page.goto('/settings/integrations')
  const reader = await createTokenInScreen(page, 'Solo lectura', ['Leer datos financieros'])
  await page.getByRole('button', { name: 'Ya lo guardé' }).click()
  const writer = await createTokenInScreen(page, 'Escritura', ['Crear Movimientos'])
  const expense = { type: 'expense', account_id: account.id, category_id: 2, amount: '12.50', description: 'Almuerzo' }

  expect((await fetch(baseURL + '/api/v1/accounts')).status).toBe(401)
  expect((await asScript(reader, '/api/v1/movements', { method: 'POST', key: 'k0', body: expense })).status).toBe(403)
  expect((await asScript(writer, '/api/v1/accounts')).status).toBe(403)
  expect((await asScript(writer, '/api/v1/movements', { method: 'POST', body: expense })).status).toBe(400)
  expect((await asScript(writer, '/api/v1/movements', { method: 'POST', key: 'k1', body: { ...expense, amount: '0' } })).status).toBe(400)
  expect((await asScript(writer, '/api/v1/movements', { method: 'POST', key: 'k1', body: { ...expense, account_id: 99999999 } })).status).toBe(404)

  const created = await asScript(writer, '/api/v1/movements', { method: 'POST', key: 'k1', body: expense })
  expect(created.status).toBe(201)
  const record = await created.json()
  expect(record).toMatchObject({ type: 'expense', amount: '12.50' })

  const retried = await asScript(writer, '/api/v1/movements', { method: 'POST', key: 'k1', body: expense })
  expect(retried.status).toBe(200)
  expect(await retried.json()).toEqual(record)
  const conflict = await asScript(writer, '/api/v1/movements', { method: 'POST', key: 'k1', body: { ...expense, amount: '99.00' } })
  expect(conflict.status).toBe(409)

  const feed = await (await asScript(reader, '/api/v1/movements?type=expense')).json()
  expect(feed.total).toBe(1)
  const balance = (await (await asScript(reader, '/api/v1/accounts')).json()).results[0].balance
  expect(balance).toBe('987.50')
  expect((await asScript(reader, '/api/v1/movements?page_size=201')).status).toBe(400)
  const documented = await (await fetch(baseURL + '/api/v1/openapi.json')).json()
  expect(Object.keys(documented.paths)).toEqual(['/api/v1/accounts', '/api/v1/budgets', '/api/v1/movements'])
})

test('the Google Apps Script example reuses its key when it retries and follows the HTTP contract', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { opening_date: '2026-01-01' })
  await page.goto('/settings/integrations')
  const secret = await createTokenInScreen(page, 'Apps Script', ['Leer datos financieros', 'Crear Movimientos'])

  const requests: { url: string; options: Record<string, any> }[] = []
  let calls = 0
  const sandbox = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (name: string) => ({ OKANE_TOKEN: secret, OKANE_URL: baseURL })[name] }),
    },
    Utilities: { getUuid: () => 'uuid-' + Math.random().toString(36).slice(2), sleep: () => undefined },
    UrlFetchApp: {
      // The first answer is lost on the way back, as on a flaky network: the request must still be repeatable.
      fetch: (url: string, options: Record<string, any>) => {
        requests.push({ url, options })
        calls += 1
        if (calls === 1) throw new Error('Address unavailable')
        return { getResponseCode: () => 201, getContentText: () => '{"id":1,"type":"expense"}', getHeaders: () => ({}) }
      },
    },
  }
  vm.runInNewContext(readFileSync(APPS_SCRIPT, 'utf8'), sandbox)
  ;(sandbox as any).createMovement({ type: 'expense', account_id: account.id, category_id: 2, amount: '5.00' })

  expect(requests).toHaveLength(2)
  const [lost, retry] = requests
  expect(lost.options.headers['Idempotency-Key']).toBe(retry.options.headers['Idempotency-Key'])
  expect(retry.options.headers.Authorization).toBe(`Bearer ${secret}`)
  expect(retry.url).toBe(`${baseURL}/api/v1/movements`)
  expect(retry.options).toMatchObject({ method: 'post', contentType: 'application/json' })

  // Replay what the script sent against the real stack: the first call creates, its retry repeats.
  const send = (call: (typeof requests)[number]) =>
    fetch(call.url, { method: 'POST', headers: { ...call.options.headers, 'Content-Type': call.options.contentType }, body: call.options.payload })
  const first = await send(lost)
  const second = await send(retry)
  expect([first.status, second.status]).toEqual([201, 200])
  expect(await second.json()).toEqual(await first.clone().json())
  const feed = await (await fetch(`${baseURL}/api/v1/movements`, { headers: { Authorization: `Bearer ${secret}` } })).json()
  expect(feed.total).toBe(1)
})
