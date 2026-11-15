import { X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { categoryByName, categories } from '../data/categories'
import { expenseAccounts, today, remainingBudget } from '../data/sample'
import { formatMoney } from '../lib/money'
import { useData } from '../state/context'

const TODAY_DATE = `${today.year}-11-${String(today.day).padStart(2, '0')}`

const parseAmount = (text: string) => {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  return amount > 0 ? amount : null
}

const fieldClassName =
  'h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 hover:border-ink-3 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

/** Quick expense entry from any screen. Date defaults to today and Account to the last one used. */
export function ExpenseForm() {
  const { state, lastAccountId, register, isFormOpen, closeForm } = useData()
  const dialog = useRef<HTMLDialogElement>(null)
  const amountField = useRef<HTMLInputElement>(null)

  const [amountInput, setAmountInput] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [accountId, setAccountId] = useState(lastAccountId)
  const [date, setDate] = useState(TODAY_DATE)
  const [description, setDescription] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (isFormOpen && !element.open) {
      setAmountInput('')
      setCategory(null)
      setAccountId(lastAccountId)
      setDate(TODAY_DATE)
      setDescription('')
      setHasSubmitted(false)
      element.showModal()
      amountField.current?.focus()
    } else if (!isFormOpen && element.open) {
      element.close()
    }
  }, [isFormOpen, lastAccountId])

  const amount = parseAmount(amountInput)
  const amountError = hasSubmitted && amount === null
  const categoryError = hasSubmitted && category === null

  const line = state.budgets.find((budget) => budget.category === category)
  const currentRemaining = line ? remainingBudget(line) : null
  const nextRemaining =
    currentRemaining !== null && amount !== null ? Math.round((currentRemaining - amount) * 100) / 100 : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setHasSubmitted(true)
    if (amount === null || category === null) {
      if (amount === null) amountField.current?.focus()
      return
    }
    const consequence =
      nextRemaining === null
        ? `${category} no tiene Presupuesto este mes.`
        : nextRemaining < 0
          ? `${category} queda excedida por ${formatMoney(-nextRemaining)}.`
          : `Restante en ${category}: ${formatMoney(nextRemaining)}.`
    register({ amount, category, accountId }, `Gasto de ${formatMoney(amount)} registrado. ${consequence}`)
    closeForm()
  }

  return (
    <dialog
      ref={dialog}
      onClose={closeForm}
      onClick={(event) => {
        if (event.target === dialog.current) closeForm()
      }}
      aria-labelledby="expense-form-title"
      className="sheet mx-0 mb-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[1.75rem] bg-surface text-ink shadow-float sm:m-auto sm:w-[30rem] sm:rounded-[1.75rem]"
    >
      <form onSubmit={handleSubmit} noValidate className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        <div className="flex items-center justify-between">
          <h2 id="expense-form-title" className="text-[1.25rem] font-semibold tracking-[-0.01em]">
            Registrar gasto
          </h2>
          <button
            type="button"
            onClick={closeForm}
            aria-label="Cerrar"
            className="-mr-2 grid size-9 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor='expense-amount' className="text-[0.9rem] font-medium text-ink-2">
            Monto
          </label>
          <div
            className={`mt-1.5 flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-2.5 transition-colors duration-150 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15 ${
              amountError ? 'border-critical' : 'border-line-strong hover:border-ink-3'
            }`}
          >
            <span className="text-[1.6rem] font-semibold text-ink-3" aria-hidden="true">
              $
            </span>
            <input
              ref={amountField}
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              aria-invalid={amountError}
              aria-describedby={amountError ? 'expense-amount-error' : undefined}
              className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
            />
          </div>
          {amountError && (
            <p id="expense-amount-error" className="mt-1.5 text-[0.9rem] text-critical">
              Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {categories.map((option) => {
              const Icon = option.icon
              const selected = category === option.name
              return (
                <label
                  key={option.name}
                  style={{ '--tone': option.tone } as CSSProperties}
                  className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border p-1.5 pr-3 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                    selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={option.name}
                    checked={selected}
                    onChange={() => setCategory(option.name)}
                    className="sr-only"
                  />
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_15%,transparent)] text-(--tone)">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span
                    className={`min-w-0 truncate text-[0.93rem] ${
                      selected ? 'font-semibold text-ink' : 'font-medium text-ink-2'
                    }`}
                  >
                    {option.name}
                  </span>
                </label>
              )
            })}
          </div>
          {categoryError && (
            <p className="mt-1.5 text-[0.9rem] text-critical">Elige la Categoría del gasto.</p>
          )}
        </fieldset>

        <p className="mt-3 min-h-[1.4em] text-[0.9rem] text-ink-2" aria-live="polite">
          {category !== null &&
            amount !== null &&
            (currentRemaining === null || nextRemaining === null
              ? `${category} no tiene Presupuesto este mes; el gasto se registra igual.`
              : nextRemaining < 0
                ? `${category} quedará excedida por ${formatMoney(-nextRemaining)}; el gasto se registra igual.`
                : `Restante en ${category}: de ${formatMoney(currentRemaining)} a ${formatMoney(nextRemaining)}.`)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor='expense-account' className="text-[0.9rem] font-medium text-ink-2">
              Cuenta
            </label>
            <select
              id="expense-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className={`${fieldClassName} mt-1.5`}
            >
              {expenseAccounts(state).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor='expense-date' className="text-[0.9rem] font-medium text-ink-2">
              Fecha
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              max={TODAY_DATE}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClassName} mt-1.5`}
            />
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor='expense-description' className="text-[0.9rem] font-medium text-ink-2">
            Descripción <span className="font-normal text-ink-3">(opcional)</span>
          </label>
          <input
            id="expense-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            autoComplete="off"
            placeholder="Supermercado, taxi, farmacia"
            className={`${fieldClassName} mt-1.5 placeholder:text-ink-3`}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="h-12 flex-1 rounded-full border border-line-strong text-[1rem] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-12 flex-[1.6] rounded-full bg-primary text-[1rem] font-semibold text-on-primary transition-transform duration-150 active:scale-[0.98]"
          >
            Registrar gasto
            {amount !== null && category !== null && (
              <span className="sr-only">
                {' '}
                de {formatMoney(amount)} en {categoryByName(category).name}
              </span>
            )}
          </button>
        </div>
      </form>
    </dialog>
  )
}
