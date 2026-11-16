import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))

function printedMail() {
  // Without a mail server webapp prints each message in its log (README).
  return execFileSync('docker', ['compose', 'logs', '--no-color', '--no-log-prefix', '--since', '5m', 'webapp'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
}

/** The path of the newest reset link that the stack under test mailed to this email. */
export async function resetLinkPathFor(email: string) {
  let path: string | undefined
  await expect(() => {
    const log = printedMail()
    const message = log.slice(log.lastIndexOf(`To: ${email}`))
    path = /^To: .*[^]*?https?:\/\/[^/\s]+(\/reset-password\/\S+)/.exec(message)?.[1]
    expect(path, `no reset link for ${email} in the webapp log`).toBeTruthy()
  }).toPass({ timeout: 10_000 })
  return path!
}
