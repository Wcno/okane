import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenNotice } from '../lib/notice'
import type { Category } from './api'
import { reloadCatalog } from './catalog'
import { categoriesBack, categoryNotice, type CategoryChange } from './presentation'

/** What every change of a Category ends with: the catalog is read again, then back to the list with a notice. */
export function useAfterCategoryChange() {
  const navigate = useNavigate()
  return useCallback(
    async (change: CategoryChange, category: Pick<Category, 'name'>) => {
      await reloadCatalog().catch(() => undefined)
      const state: ScreenNotice = { notice: categoryNotice(change, category) }
      navigate(categoriesBack.to, { state })
    },
    [navigate],
  )
}
