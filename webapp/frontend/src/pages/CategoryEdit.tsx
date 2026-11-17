import { useSignedInUser } from '../auth/context'
import { renameCategory, type Category } from '../categories/api'
import { categoriesBack } from '../categories/presentation'
import { useAfterCategoryChange } from '../categories/useAfterCategoryChange'
import { CategoryEditor } from '../components/categories/CategoryEditor'
import { OneCategoryScreen } from '../components/categories/OneCategoryScreen'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'

function EditForm({ category }: { category: Category }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterCategoryChange()

  return (
    <>
      <ScreenHeader
        title="Editar Categoría"
        back={categoriesBack}
        intro="El nuevo nombre se ve también en tus Gastos y Presupuestos pasados."
      />
      <CategoryEditor
        initial={{ name: category.name }}
        save={(input) => renameCategory(category.id, input, csrfToken)}
        onSaved={(saved) => afterChange('renamed', saved)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
      >
        <DeleteLink to={`/categories/${category.id}/archive`}>Archivar esta Categoría</DeleteLink>
      </CategoryEditor>
    </>
  )
}

/** Renames one of the User's own Categories. */
export function CategoryEdit() {
  return (
    <OneCategoryScreen title="Editar Categoría">
      {(category) => <EditForm key={category.id} category={category} />}
    </OneCategoryScreen>
  )
}
