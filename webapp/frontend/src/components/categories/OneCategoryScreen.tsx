import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { getCategory, type Category } from '../../categories/api'
import { categoriesBack } from '../../categories/presentation'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const CATEGORY_ID = /^[1-9]\d{0,17}$/

const notHere = {
  title: 'No encontramos esta Categoría',
  text: 'Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a tus Categorías para elegirla de la lista.',
}

function LoadedCategory({
  categoryId,
  title,
  children,
}: {
  categoryId: number
  title: string
  children: (category: Category) => ReactNode
}) {
  const { state, retry } = useLoaded(() => getCategory(categoryId), categoryId)

  if (state.status === 'gone') return <NotHere {...notHere} back={categoriesBack} />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={categoriesBack} />
        <Pending state={state} retry={retry} loading="Cargando la Categoría…" />
      </>
    )
  }
  const category = state.value
  return <>{children(category)}</>
}

/** Frame of the screens that act on one Category of the User, named by the `:id` of the route. */
export function OneCategoryScreen({ title, children }: { title: string; children: (category: Category) => ReactNode }) {
  const { id } = useParams()
  if (!CATEGORY_ID.test(id ?? '')) return <NotHere {...notHere} back={categoriesBack} />
  return (
    <LoadedCategory categoryId={Number(id)} title={title}>
      {children}
    </LoadedCategory>
  )
}
