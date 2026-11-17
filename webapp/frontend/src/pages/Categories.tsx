import { useLocation } from 'react-router-dom'
import type { Category } from '../categories/api'
import { useCatalog } from '../categories/catalog'
import { groupCategories } from '../categories/presentation'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { RecordRow } from '../components/screen/RecordRow'
import { NoticeBanner, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { noticeFrom } from '../lib/notice'

function Group({
  id,
  title,
  note,
  categories,
  editable,
}: {
  id: string
  title: string
  note?: string
  categories: Category[]
  editable: boolean
}) {
  return (
    <section aria-labelledby={id} className={cardClassName}>
      <h2 id={id} className="text-[1rem] font-medium text-ink-2">
        {title}
      </h2>
      {note && <p className="mt-1 text-[0.9rem] text-ink-3">{note}</p>}
      <ul className="mt-3 divide-y divide-line">
        {categories.map((category) => (
          <RecordRow
            key={category.id}
            to={editable ? `/categories/${category.id}/edit` : undefined}
            action="Editar Categoría"
            icon={<CategoryChip categoryId={category.id} />}
            title={category.name}
          />
        ))}
      </ul>
    </section>
  )
}

/** The Categories of the User: their own, the initial catalog and the archived ones. */
export function Categories() {
  const categories = useCatalog()
  const notice = noticeFrom(useLocation().state)
  const { own, initial, archived } = groupCategories(categories)

  return (
    <>
      <ScreenHeader
        title="Categorías"
        intro="Con ellas ordenas tus Gastos y pones límites en tus Presupuestos."
        action={{ to: '/categories/create', label: 'Nueva Categoría', shortLabel: 'Nueva' }}
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      <div className="max-w-[44rem] space-y-4 lg:space-y-5">
        {own.length > 0 ? (
          <Group id="own-title" title="Tus Categorías" categories={own} editable />
        ) : (
          <section aria-labelledby="own-title" className={cardClassName}>
            <h2 id="own-title" className="text-[1rem] font-medium text-ink-2">
              Tus Categorías
            </h2>
            <p className="mt-2 text-ink-2">
              Aún no creaste ninguna. Usa Nueva Categoría para ampliar las iniciales con las tuyas.
            </p>
          </section>
        )}
        <Group id="initial-title" title="Categorías iniciales" categories={initial} editable={false} />
        {archived.length > 0 && (
          <Group
            id="archived-title"
            title="Archivadas"
            note="No se ofrecen para Gastos ni Presupuestos nuevos; los pasados se siguen viendo."
            categories={archived}
            editable={false}
          />
        )}
      </div>
    </>
  )
}
