import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAccount, type AccountField, type AccountType } from '../accounts/api'
import { NAME_MAX_LENGTH, validateNewAccount } from '../accounts/form'
import { accountsBack, accountTypeDescriptions, accountTypeLabels, accountTypes } from '../accounts/presentation'
import { useSignedInUser } from '../auth/context'
import { ScreenHeader, cardClassName } from '../components/screen/Screen'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'
import { todayInPanama } from '../lib/dates'
import { useFieldErrors } from '../lib/fieldErrors'
import { formatMoney } from '../lib/money'
import type { ScreenNotice } from '../lib/notice'
import { useSubmission } from '../lib/useSubmission'

/** Create account: name, type, opening balance and the day its record starts. */
export function AccountCreate() {
  const { csrfToken } = useSignedInUser()
  const { isSubmitting, submit } = useSubmission()
  const navigate = useNavigate()
  const today = todayInPanama()

  const nameField = useRef<HTMLInputElement>(null)
  const firstTypeOption = useRef<HTMLInputElement>(null)
  const openingBalanceField = useRef<HTMLInputElement>(null)
  const openingDateField = useRef<HTMLInputElement>(null)
  const rateField = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType | null>(null)
  const [openingBalance, setOpeningBalance] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [openingDate, setOpeningDate] = useState(today)
  const [annualRatePercent, setAnnualRatePercent] = useState('')
  const { errors, setErrors, clearErrors } = useFieldErrors<AccountField>()

  const showErrors = (found: typeof errors) => {
    setErrors(found)
    if (found.name) nameField.current?.focus()
    else if (found.type) firstTypeOption.current?.focus()
    else if (found.openingBalance) openingBalanceField.current?.focus()
    else if (found.openingDate) openingDateField.current?.focus()
    else if (found.annualInterestRate) rateField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateNewAccount({ name, type, openingBalance, isDebt, openingDate, annualRatePercent }, today)
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await submit(
      () => createAccount(checked.account, csrfToken),
      (created) => {
        const state: ScreenNotice = {
          notice: `Creaste ${created.name} con un Saldo inicial de ${formatMoney(created.openingBalance)}.`,
        }
        navigate('/accounts', { state })
      },
    )
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return (
    <>
      <ScreenHeader
        title="Crear cuenta"
        back={accountsBack}
        intro="Una Cuenta es un lugar donde está tu dinero. Su Saldo se calculará a partir de lo que registres en ella."
      />

      <section className={`${cardClassName} max-w-[34rem]`}>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

          <TextField
            ref={nameField}
            id="account-name"
            label="Nombre"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            placeholder="Cuenta corriente"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearErrors('name')
            }}
            errors={errors.name}
          />

          <fieldset aria-describedby={errors.type ? 'account-type-error' : undefined}>
            <legend className="text-[0.9rem] font-medium text-ink-2">Tipo</legend>
            <div className="mt-2 space-y-1.5">
              {accountTypes.map((option, index) => {
                const selected = type === option
                return (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                      selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    <input
                      ref={index === 0 ? firstTypeOption : undefined}
                      type="radio"
                      name="account-type"
                      value={option}
                      checked={selected}
                      onChange={() => {
                        setType(option)
                        clearErrors('type')
                      }}
                      className="mt-1 size-4 shrink-0 accent-(--ink) focus-visible:outline-none"
                    />
                    <span className="min-w-0">
                      <span className={`block text-[1rem] ${selected ? 'font-semibold' : 'font-medium'}`}>
                        {accountTypeLabels[option]}
                      </span>
                      <span className="mt-0.5 block text-[0.87rem] leading-snug text-ink-3">
                        {accountTypeDescriptions[option]}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {errors.type ? (
              <p id="account-type-error" className="mt-1.5 text-[0.9rem] text-critical">
                {errors.type.join(' ')}
              </p>
            ) : (
              <p className="mt-1.5 text-[0.87rem] text-ink-3">El tipo no se puede cambiar después.</p>
            )}
          </fieldset>

          <div>
            <TextField
              ref={openingBalanceField}
              id="account-opening-balance"
              label="Saldo inicial"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={openingBalance}
              onChange={(event) => {
                setOpeningBalance(event.target.value)
                clearErrors('openingBalance')
              }}
              hint={
                type === 'spending' && isDebt
                  ? 'Lo que debías en la fecha de inicio. Se guardará en negativo y no se puede cambiar después.'
                  : 'El dinero que había en la Cuenta en la fecha de inicio. No se puede cambiar después.'
              }
              errors={errors.openingBalance}
            />
            {type === 'spending' && (
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[0.95rem]">
                <input
                  type="checkbox"
                  checked={isDebt}
                  onChange={(event) => setIsDebt(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-(--ink)"
                />
                <span>
                  Es una deuda, como una tarjeta de crédito
                  <span className="block text-[0.87rem] text-ink-3">Lo que debes resta de lo que puedes gastar.</span>
                </span>
              </label>
            )}
          </div>

          <TextField
            ref={openingDateField}
            id="account-opening-date"
            label="Fecha de inicio del registro"
            type="date"
            max={today}
            value={openingDate}
            onChange={(event) => {
              setOpeningDate(event.target.value)
              clearErrors('openingDate')
            }}
            hint="Podrás registrar movimientos desde este día. Elige una fecha anterior si vas a cargar meses pasados; no se puede cambiar después."
            errors={errors.openingDate}
          />

          {type === 'savings' && (
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
              hint="Opcional. La que paga tu banco; sirve para proyectar tu ahorro."
              errors={errors.annualInterestRate}
            />
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Link to="/accounts" className={`${secondaryButtonClassName} sm:flex-1`}>
              Cancelar
            </Link>
            <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
              {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
