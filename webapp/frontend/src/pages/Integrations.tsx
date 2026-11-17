import { Check, Copy, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName, smallSecondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { cardClassName, Pending, ScreenHeader } from '../components/screen/Screen'
import { TextField } from '../components/TextField'
import {
  createToken,
  listTokens,
  revokeToken,
  TOKEN_SCOPES,
  validateToken,
  type PersonalToken,
  type TokenField,
  type TokenScope,
} from '../integrations/api'
import type { FieldErrors } from '../lib/http'
import { useFieldErrors } from '../lib/useFieldErrors'
import { useLoaded } from '../lib/useLoaded'
import { useSubmission } from '../lib/useSubmission'

const dayInPanama = new Intl.DateTimeFormat('es', { timeZone: 'America/Panama', day: 'numeric', month: 'short', year: 'numeric' })
const formatTimestamp = (timestamp: string) => dayInPanama.format(new Date(timestamp))
const scopeLabel = (scope: TokenScope) => TOKEN_SCOPES.find((known) => known.value === scope)?.label ?? scope

/** Integrations: the personal tokens that let the User's own scripts use `/api/v1`. */
export function Integrations() {
  const [version, setVersion] = useState(0)
  const { state, retry } = useLoaded(listTokens, version)
  const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  // The control that was pressed disappears, so the keyboard continues at the list.
  const focusList = () => listHeading.current?.focus()

  return (
    <>
      <ScreenHeader
        title="Integraciones"
        back={{ to: '/menu', label: 'Secciones', desktop: { to: '/settings', label: 'Preferencias' } }}
        intro="Los tokens personales dejan que tus propios scripts lean tus datos o creen Movimientos. No dan acceso a otras personas ni a tu contraseña."
      />
      <div className="max-w-[40rem] space-y-5">
        <NewTokenCard
          onCreated={(created) => {
            setRevealed(created)
            setVersion((count) => count + 1)
          }}
        />
        {revealed && (
          <SecretCard
            key={revealed.secret}
            name={revealed.name}
            secret={revealed.secret}
            onDone={() => {
              setRevealed(null)
              focusList()
            }}
          />
        )}
        {state.status === 'ready' ? (
          <TokenList
            tokens={state.value}
            headingRef={listHeading}
            onRevoked={() => {
              setVersion((count) => count + 1)
              focusList()
            }}
          />
        ) : (
          state.status !== 'gone' && <Pending state={state} retry={retry} loading="Cargando tus tokens…" />
        )}
      </div>
    </>
  )
}

function NewTokenCard({ onCreated }: { onCreated: (created: { name: string; secret: string }) => void }) {
  const { csrfToken } = useSignedInUser()
  const { isSubmitting, submit } = useSubmission()
  const nameField = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<TokenScope[]>([])
  const { errors, setErrors, clearErrors } = useFieldErrors<TokenField>()

  const show = (found: FieldErrors<TokenField>) => {
    setErrors(found)
    if (found.name) nameField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateToken({ name, scopes })
    if (found) return show(found)
    setErrors({})
    const outcome = await submit(
      () => createToken({ name, scopes }, csrfToken),
      ({ token, secret }) => {
        setName('')
        setScopes([])
        onCreated({ name: token.name, secret })
      },
    )
    if (outcome && !outcome.ok) show(outcome.errors)
  }

  const toggle = (scope: TokenScope) => {
    clearErrors('scopes')
    setScopes((current) => (current.includes(scope) ? current.filter((known) => known !== scope) : [...current, scope]))
  }

  return (
    <section aria-labelledby="new-token-title" className={cardClassName}>
      <h2 id="new-token-title" className="text-[1.15rem] font-semibold">
        Crear token
      </h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}
        <TextField
          ref={nameField}
          id="token-name"
          label="Nombre"
          autoComplete="off"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            clearErrors('name')
          }}
          hint="Para reconocerlo después, por ejemplo Google Sheets."
          errors={errors.name}
        />
        <fieldset aria-describedby={errors.scopes ? 'token-scopes-error' : undefined}>
          <legend className="text-[0.9rem] font-medium text-ink-2">Permisos</legend>
          <div className="mt-1.5 space-y-2">
            {TOKEN_SCOPES.map((scope) => (
              <label key={scope.value} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope.value)}
                  onChange={() => toggle(scope.value)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                />
                <span>
                  <span className="block text-[1rem] font-medium">{scope.label}</span>
                  <span className="block text-[0.87rem] text-ink-3">{scope.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.scopes && (
            <p id="token-scopes-error" className="mt-1.5 text-[0.9rem] text-critical">
              {errors.scopes.join(' ')}
            </p>
          )}
        </fieldset>
        <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
          {isSubmitting ? 'Creando token…' : 'Crear token'}
        </button>
      </form>
    </section>
  )
}

/** The one time the secret is readable: it is not stored and cannot be asked for again. */
function SecretCard({ name, secret, onDone }: { name: string; secret: string; onDone: () => void }) {
  const card = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  // The secret is shown once: bring it into view and to the keyboard, even below the form on a phone.
  useEffect(() => {
    card.current?.focus()
    card.current?.scrollIntoView({ block: 'start' })
  }, [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      // Without clipboard access the User selects the text by hand.
    }
  }

  return (
    <section ref={card} tabIndex={-1} aria-label="Token nuevo" className={`${cardClassName} focus:outline-none`}>
      <h2 className="text-[1.15rem] font-semibold">Copia tu token ahora</h2>
      <p className="mt-1 text-ink-2">
        «{name}» se creó. Por seguridad no volverá a mostrarse: guárdalo en un lugar seguro, como las propiedades de tu
        script.
      </p>
      <code
        data-testid="token-secret"
        className="mt-4 block select-all break-all rounded-xl bg-surface-2 p-3.5 font-mono text-[0.9rem]"
      >
        {secret}
      </code>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={copy} className={smallSecondaryButtonClassName}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar token'}
        </button>
        <button type="button" onClick={onDone} className={smallSecondaryButtonClassName}>
          Ya lo guardé
        </button>
      </div>
    </section>
  )
}

function TokenList({
  tokens,
  headingRef,
  onRevoked,
}: {
  tokens: PersonalToken[]
  headingRef: Ref<HTMLHeadingElement>
  onRevoked: () => void
}) {
  return (
    <section aria-labelledby="tokens-title" className={cardClassName}>
      <h2 id="tokens-title" ref={headingRef} tabIndex={-1} className="text-[1.15rem] font-semibold focus:outline-none">
        Tus tokens
      </h2>
      {tokens.length === 0 ? (
        <p className="mt-2 text-ink-2">Todavía no creaste ningún token.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} onRevoked={onRevoked} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TokenRow({ token, onRevoked }: { token: PersonalToken; onRevoked: () => void }) {
  const { csrfToken } = useSignedInUser()
  const { isSubmitting, submit } = useSubmission()
  const [asking, setAsking] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const isRevoked = token.revokedAt !== null

  const revoke = async () => {
    setFailure(null)
    const outcome = await submit(() => revokeToken(token.id, csrfToken), onRevoked)
    if (outcome && !outcome.ok) setFailure(outcome.errors.form?.join(' ') ?? 'No pudimos revocar el token.')
    setAsking(false)
  }

  return (
    <li className="py-4">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <KeyRound size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[1rem] font-medium">{token.name}</h3>
          <p className="text-[0.87rem] text-ink-3">
            <span className="sr-only">Identificador </span>
            <code>okt_{token.prefix}…</code>
          </p>
          <p className="mt-1 text-[0.9rem] text-ink-2">{token.scopes.map(scopeLabel).join(' · ')}</p>
          <p className="mt-1 text-[0.87rem] text-ink-3">
            Creado el {formatTimestamp(token.createdAt)}
            {isRevoked && token.revokedAt && ` · Revocado el ${formatTimestamp(token.revokedAt)}`}
          </p>
        </div>
        {!isRevoked && !asking && (
          <button
            type="button"
            onClick={() => setAsking(true)}
            aria-label={`Revocar token ${token.name}`}
            className={smallSecondaryButtonClassName}
          >
            Revocar
          </button>
        )}
      </div>
      {asking && (
        <div role="group" aria-label={`Confirmar revocación de ${token.name}`} className="mt-3 rounded-2xl bg-surface-2 p-3.5">
          <p className="text-[0.95rem]">Los scripts que usen este token dejarán de funcionar de inmediato.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={revoke} disabled={isSubmitting} className={smallSecondaryButtonClassName}>
              {isSubmitting ? 'Revocando…' : `Sí, revocar ${token.name}`}
            </button>
            <button type="button" onClick={() => setAsking(false)} className={smallSecondaryButtonClassName}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {failure && (
        <div className="mt-3">
          <FormAlert>{failure}</FormAlert>
        </div>
      )}
    </li>
  )
}
