import { useSignedInUser } from '../auth/context'
import { archiveCategory, type Category } from '../categories/api'
import { categoriesBack } from '../categories/presentation'
import { useAfterCategoryChange } from '../categories/useAfterCategoryChange'
import { OneCategoryScreen } from '../components/categories/OneCategoryScreen'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'

function Confirmation({ category }: { category: Category }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterCategoryChange()

  return (
    <>
      <ScreenHeader title="Archivar Categoría" back={categoriesBack} />
      <ConfirmCard
        summary={<RecordSummary icon={<CategoryChip categoryId={category.id} />} title={category.name} />}
        message="Dejará de ofrecerse para Gastos, Presupuestos y Pagos recurrentes nuevos. Sus Gastos y Presupuestos pasados se conservan y se siguen viendo. Si tiene Pagos recurrentes, muévelos a otra Categoría o elimínalos antes."
        cancel={{ to: categoriesBack.to, label: 'Cancelar' }}
        confirm={{
          label: 'Archivar Categoría',
          busyLabel: 'Archivando…',
          run: () => archiveCategory(category.id, csrfToken),
          onSaved: (archived) => afterChange('archived', archived),
          failure: 'No pudimos archivar la Categoría. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Archives one of the User's own Categories after saying what stays as it is. */
export function CategoryArchive() {
  return <OneCategoryScreen title="Archivar Categoría">{(category) => <Confirmation category={category} />}</OneCategoryScreen>
}
