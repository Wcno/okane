import { Tags } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Category } from '../categories/api'
import { useCatalog } from '../categories/catalog'
import { groupCategories } from '../categories/presentation'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, ScreenHeader, cardClassName } from '../components/screen/Screen'
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

const createAction = { to: '/categories/create', label: 'Nueva Categoría', shortLabel: 'Nueva' }

/** The Categories of the User: the ones in use and the archived ones. */
export function Categories() {
  const categories = useCatalog()
  const notice = noticeFrom(useLocation().state)
  const { active, archived } = groupCategories(categories)

  return (
    <>
      <ScreenHeader
        title="Categorías"
        intro="Con ellas ordenas tus Gastos y pones límites en tus Presupuestos."
        action={active.length > 0 || archived.length > 0 ? createAction : undefined}
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No tienes Categorías"
          text="Crea las que necesites para ordenar tus Gastos y ponerles límite en tus Presupuestos."
          action={{ to: createAction.to, label: 'Crear una Categoría' }}
        />
      ) : (
        <div className="max-w-[44rem] space-y-4 lg:space-y-5">
          {active.length > 0 && <Group id="active-title" title="Tus Categorías" categories={active} editable />}
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
      )}
    </>
  )
}
