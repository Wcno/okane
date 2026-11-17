import type { InputHTMLAttributes, Ref } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string
  label: string
  hint?: string
  errors?: string[]
  ref?: Ref<HTMLInputElement>
}

/** Labelled input whose hint and error are announced with it (DESIGN.md, Inputs / Fields). */
export function TextField({ id, label, hint, errors, ...input }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = errors ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(errors)}
        aria-describedby={describedBy}
        className={`mt-1.5 h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
          errors ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'
        }`}
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-[0.87rem] text-ink-3">
          {hint}
        </p>
      )}
      {errors && (
        <p id={errorId} className="mt-1.5 text-[0.9rem] text-critical">
          {errors.join(' ')}
        </p>
      )}
    </div>
  )
}
