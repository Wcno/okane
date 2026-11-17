import type { ReactNode } from 'react'
import { borderClassName, fieldClassName } from './record/fieldStyles'

/** Labelled native select; a row of a filters or settings form. */
export function SelectField({
  id,
  label,
  value,
  onChange,
  errors,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  errors?: string[]
  children: ReactNode
}) {
  const errorId = errors ? `${id}-error` : undefined
  return (
    <div className="col-span-2 sm:col-span-1">
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={Boolean(errors)}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClassName} ${borderClassName(Boolean(errors))} mt-1.5`}
      >
        {children}
      </select>
      {errors && (
        <p id={errorId} className="mt-1.5 text-[0.9rem] text-critical">
          {errors.join(' ')}
        </p>
      )}
    </div>
  )
}
