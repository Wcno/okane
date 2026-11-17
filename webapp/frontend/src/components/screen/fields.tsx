import type { Ref } from 'react'
import { todayInPanama } from '../../lib/dates'
import { borderClassName, fieldClassName } from './fieldStyles'

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null
  return (
    <p id={id} className="mt-1.5 text-[0.9rem] text-critical">
      {errors.join(' ')}
    </p>
  )
}

/** The big amount field of every record that moves money; the text stays a string until it is parsed. */
export function AmountField({
  id,
  value,
  onChange,
  errors,
  inputRef,
}: {
  id: string
  value: string
  onChange: (text: string) => void
  errors?: string[]
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        Monto
      </label>
      <div
        className={`mt-1.5 flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-2.5 transition-colors duration-150 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15 ${
          errors ? 'border-critical' : 'border-line-strong hover:border-ink-3'
        }`}
      >
        <span className="text-[1.6rem] font-semibold text-ink-3" aria-hidden="true">
          $
        </span>
        <input
          ref={inputRef}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(errors)}
          aria-describedby={errors ? `${id}-error` : undefined}
          className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
        />
      </div>
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  )
}

/** A day field that cannot go past today in Panama nor before `min`. */
export function DateField({
  id,
  value,
  min,
  onChange,
  errors,
}: {
  id: string
  value: string
  min?: string
  onChange: (day: string) => void
  errors?: string[]
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        Fecha
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={todayInPanama()}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(errors)}
        aria-describedby={errors ? `${id}-error` : undefined}
        className={`${fieldClassName} ${borderClassName(Boolean(errors))} mt-1.5`}
      />
    </div>
  )
}

export function DescriptionField({
  id,
  value,
  maxLength,
  placeholder,
  onChange,
  errors,
}: {
  id: string
  value: string
  maxLength: number
  placeholder: string
  onChange: (text: string) => void
  errors?: string[]
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        Descripción <span className="font-normal text-ink-3">(opcional)</span>
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(errors)}
        aria-describedby={errors ? `${id}-error` : undefined}
        className={`${fieldClassName} ${borderClassName(Boolean(errors))} mt-1.5 placeholder:text-ink-3`}
      />
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  )
}
