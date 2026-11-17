import type { FormEvent, ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from './Screen'

/**
 * The card with the form that registers or corrects one record: its fields,
 * the alert for what belongs to no field, and Cancelar / the main action.
 * `children` below the buttons hold the way to the delete screen.
 */
export function RecordForm({
  form,
  onSubmit,
  formErrors,
  isSubmitting,
  submitLabel,
  submittingLabel,
  cancelTo,
  fields,
  children,
}: {
  form: Ref<HTMLFormElement>
  onSubmit: (event: FormEvent) => void
  formErrors?: string[]
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
  cancelTo: string
  fields: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={form} onSubmit={onSubmit} noValidate className="space-y-5">
        {formErrors && <FormAlert>{formErrors.join(' ')}</FormAlert>}

        {fields}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
          <Link to={cancelTo} className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
      {children}
    </section>
  )
}
