import type { FormEvent, ReactNode, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'

/**
 * The card around the form that registers or corrects one record of money
 * (Gasto, Ingreso). The fields come from the kind of record; Register and Edit
 * differ in the labels and in what goes under the buttons.
 */
export function RecordEditor({
  formRef,
  onSubmit,
  isSubmitting,
  formError,
  fields,
  submitLabel,
  submittingLabel,
  cancelTo,
  children,
}: {
  formRef: RefObject<HTMLFormElement | null>
  onSubmit: (event: FormEvent) => void
  isSubmitting: boolean
  /** What api-service said about the record as a whole, not about one field. */
  formError?: string[]
  fields: ReactNode
  submitLabel: string
  submittingLabel: string
  cancelTo: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormAlert>{formError.join(' ')}</FormAlert>}

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
