import type { ReactNode } from 'react'
import type { Category, CategoryField, CategoryInput } from '../../categories/api'
import { NAME_MAX_LENGTH, validateCategory, type CategoryDraft } from '../../categories/form'
import type { Outcome } from '../../lib/http'
import { useRecordForm } from '../../lib/useRecordForm'
import { RecordEditor } from '../record/RecordEditor'
import { TextField } from '../TextField'

/** The card with the form that creates or renames one Category; Create and Edit differ in what they pass. */
export function CategoryEditor({
  initial,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  children,
}: {
  initial: CategoryDraft
  save: (input: CategoryInput) => Promise<Outcome<Category, CategoryField>>
  onSaved: (category: Category) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  /** Extra content below the buttons, such as the way to the archive screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm<
    CategoryDraft,
    CategoryField,
    CategoryInput,
    Category
  >({ initial, validate: validateCategory, save, onSaved })

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo="/categories"
      fields={
        <TextField
          id="category-name"
          label="Nombre"
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          placeholder="Mascotas"
          value={draft.name}
          onChange={(event) => change({ name: event.target.value })}
          errors={errors.name}
        />
      }
    >
      {children}
    </RecordEditor>
  )
}
