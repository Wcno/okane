import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateAccount, type Account, type AccountField } from '../accounts/api'
import { NAME_MAX_LENGTH, ratioToPercent, validateAccountChanges } from '../accounts/form'
import { accountsBack, accountTypeLabels } from '../accounts/presentation'
import { useSignedInUser } from '../auth/context'
import { OneAccountScreen } from '../components/accounts/OneAccountScreen'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader, cardClassName } from '../components/screen/Screen'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'
import { formatDay } from '../lib/dates'
import { useFieldErrors } from '../lib/fieldErrors'
import { formatMoney } from '../lib/money'
import type { ScreenNotice } from '../lib/notice'
import { useSubmission } from '../lib/useSubmission'

function EditForm({ account }: { account: Account }) {
  const { csrfToken } = useSignedInUser()
  const { isSubmitting, submit } = useSubmission()
  const navigate = useNavigate()
  const isSavings = account.type === 'savings'

  const nameField = useRef<HTMLInputElement>(null)
  const rateField = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(account.name)
  const [annualRatePercent, setAnnualRatePercent] = useState(
    account.annualInterestRate === null ? '' : ratioToPercent(account.annualInterestRate),
  )
  const { errors, setErrors, clearErrors } = useFieldErrors<AccountField>()

  const showErrors = (found: typeof errors) => {
    setErrors(found)
    if (found.name) nameField.current?.focus()
    else if (found.annualInterestRate) rateField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateAccountChanges({ name, annualRatePercent }, account.type)
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await submit(
      () => updateAccount(account.id, checked.changes, csrfToken),
      (saved) => {
        const state: ScreenNotice = { notice: `Guardaste los cambios de ${saved.name}.` }
        navigate('/accounts', { state })
      },
    )
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return (
    <>
      <ScreenHeader title="Editar cuenta" back={accountsBack} />

      <section className={`${cardClassName} max-w-[34rem]`}>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

          <TextField
            ref={nameField}
            id="account-name"
            label="Nombre"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearErrors('name')
            }}
            errors={errors.name}
          />

          {isSavings && (
            <TextField
              ref={rateField}
              id="account-annual-rate"
              label="Tasa de interés anual (%)"
              inputMode="decimal"
              autoComplete="off"
              placeholder="4.25"
              value={annualRatePercent}
              onChange={(event) => {
                setAnnualRatePercent(event.target.value)
                clearErrors('annualInterestRate')
              }}
              hint="Opcional. Déjala vacía si la Cuenta no paga intereses."
              errors={errors.annualInterestRate}
            />
          )}

          <div className="rounded-2xl bg-surface-2 p-4">
            <h2 className="text-[0.9rem] font-medium text-ink-2">Lo que no se edita</h2>
            <dl className="mt-2.5 space-y-1.5 text-[0.95rem]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-2">Saldo</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(account.balance)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-2">Saldo inicial</dt>
                <dd className="tabular-nums">{formatMoney(account.openingBalance)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-2">Fecha de inicio del registro</dt>
                <dd className="tabular-nums">{formatDay(account.openingDate)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-2">Tipo</dt>
                <dd>{accountTypeLabels[account.type]}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[0.87rem] leading-snug text-ink-3">
              El Saldo se calcula a partir del Saldo inicial y de lo que registras. Para corregirlo, registra o corrige
              un movimiento.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Link to="/accounts" className={`${secondaryButtonClassName} sm:flex-1`}>
              Cancelar
            </Link>
            <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
        {account.archivedAt === null && (
          <DeleteLink to={`/accounts/${account.id}/delete`}>
            {account.hasRecords ? 'Archivar esta cuenta' : 'Eliminar esta cuenta'}
          </DeleteLink>
        )}
      </section>
    </>
  )
}

/** Edit account: the name and, on savings, the annual rate. Never the Balance (ADR 0002). */
export function AccountEdit() {
  return (
    <OneAccountScreen title="Editar cuenta">
      {(account) => <EditForm key={account.id} account={account} />}
    </OneAccountScreen>
  )
}
