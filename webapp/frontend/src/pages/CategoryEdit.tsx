import { useSignedInUser } from '../auth/context'
import { renameCategory, restoreCategory, type Category } from '../categories/api'
import { categoriesBack } from '../categories/presentation'
import { useAfterCategoryChange } from '../categories/useAfterCategoryChange'
import { CategoryEditor } from '../components/categories/CategoryEditor'
import { OneCategoryScreen } from '../components/categories/OneCategoryScreen'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
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
        <DeleteLink to={`/categories/${category.id}/archive`} icon={category.hasRecords ? 'archive' : 'delete'}>
          {category.hasRecords ? 'Archivar esta Categoría' : 'Eliminar esta Categoría'}
        </DeleteLink>
      </CategoryEditor>
    </>
  )
}

/** What an archived Category offers: to be restored, or deleted for good while nothing refers to it. */
function ArchivedView({ category }: { category: Category }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterCategoryChange()

  return (
    <>
      <ScreenHeader
        title="Categoría archivada"
        back={categoriesBack}
        intro="Ya no se ofrece para Gastos ni Presupuestos nuevos; los pasados se siguen viendo."
      />
      <ConfirmCard
        summary={<RecordSummary icon={<CategoryChip categoryId={category.id} />} title={category.name} />}
        message="Si la restauras, vuelve a ofrecerse para Gastos, Presupuestos y Pagos recurrentes nuevos."
        cancel={{ to: categoriesBack.to, label: 'Volver' }}
        confirm={{
          label: 'Restaurar',
          busyLabel: 'Restaurando…',
          run: () => restoreCategory(category.id, csrfToken),
          onSaved: (restored) => afterChange('restored', restored),
          failure: 'No pudimos restaurar la Categoría. Inténtalo de nuevo.',
        }}
      />
      {!category.hasRecords && (
        <div className="max-w-[34rem] px-5 lg:px-6">
          <DeleteLink to={`/categories/${category.id}/archive`}>Eliminar esta Categoría</DeleteLink>
        </div>
      )}
    </>
  )
}

/** Renames one of the User's Categories, initial ones included; an archived one can be restored. */
export function CategoryEdit() {
  return (
    <OneCategoryScreen title="Editar Categoría">
      {(category) =>
        category.archivedAt === null ? (
          <EditForm key={category.id} category={category} />
        ) : (
          <ArchivedView key={category.id} category={category} />
        )
      }
    </OneCategoryScreen>
  )
}
