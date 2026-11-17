import { useSignedInUser } from '../auth/context'
import { deleteCategory, type Category } from '../categories/api'
import { categoriesBack } from '../categories/presentation'
import { useAfterCategoryChange } from '../categories/useAfterCategoryChange'
import { OneCategoryScreen } from '../components/categories/OneCategoryScreen'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'

function Confirmation({ category }: { category: Category }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterCategoryChange()
  // A Category with records is archived instead: deleting it would rewrite history.
  const willArchive = category.hasRecords
  const label = willArchive ? 'Archivar Categoría' : 'Eliminar Categoría'

  return (
    <>
      <ScreenHeader title={label} back={categoriesBack} />
      <ConfirmCard
        summary={<RecordSummary icon={<CategoryChip categoryId={category.id} />} title={category.name} />}
        message={
          willArchive
            ? 'Esta Categoría tiene movimientos; se archivará y conservará su historial. Dejará de ofrecerse para Gastos, Presupuestos y Pagos recurrentes nuevos, y sus Gastos y Presupuestos pasados se siguen viendo. Si tiene Pagos recurrentes, muévelos a otra Categoría o elimínalos antes.'
            : 'Esta Categoría no tiene Gastos, Presupuestos ni Pagos recurrentes. Se borrará por completo y no podrás recuperarla.'
        }
        cancel={{ to: categoriesBack.to, label: 'Cancelar' }}
        confirm={{
          label,
          busyLabel: willArchive ? 'Archivando…' : 'Eliminando…',
          run: () => deleteCategory(category.id, csrfToken),
          onSaved: (removal) => afterChange(removal.result, category),
          failure: 'No pudimos completar el cambio. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Delete screen of a Category: removes one without records, archives one that has them. */
export function CategoryArchive() {
  return <OneCategoryScreen title="Eliminar Categoría">{(category) => <Confirmation category={category} />}</OneCategoryScreen>
}
