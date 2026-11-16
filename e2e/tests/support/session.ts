import { expect, type APIRequestContext } from '@playwright/test'

export const PASSWORD = 'correct-horse-battery'

/** A fresh email per call, so tests never share a User across runs. */
export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

/**
 * Registers a User through webapp's HTTP surface. With `page.request` the
 * session cookie lands in the page's browser context, so the page is signed in.
 */
export async function signUp(request: APIRequestContext, email = uniqueEmail()) {
  const session = await request.get('/auth/session')
  const { csrf_token: csrfToken } = await session.json()
  const response = await request.post('/auth/register', {
    data: { email, password: PASSWORD },
    headers: { 'X-CSRFToken': csrfToken },
  })
  expect(response.status()).toBe(201)
  return email
}
