import { useSignedInUser } from '../auth/context'
import { createCategory } from '../categories/api'
import { categoriesBack } from '../categories/presentation'
import { useAfterCategoryChange } from '../categories/useAfterCategoryChange'
import { CategoryEditor } from '../components/categories/CategoryEditor'
import { ScreenHeader } from '../components/screen/Screen'

/** Creates one of the User's own Categories. */
export function CategoryCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterCategoryChange()

  return (
    <>
      <ScreenHeader
        title="Nueva Categoría"
        back={categoriesBack}
        intro="Ponle el nombre con el que quieres ver tus Gastos y Presupuestos."
      />
      <CategoryEditor
        initial={{ name: '' }}
        save={(input) => createCategory(input, csrfToken)}
        onSaved={(category) => afterChange('created', category)}
        submitLabel="Crear Categoría"
        submittingLabel="Creando…"
      />
    </>
  )
}
