import type { CSSProperties } from 'react'
import { categoryById } from '../../data/categories'

/** The tinted icon chip of a Category (DESIGN.md, Ficha de Categoría); the name always sits beside it. */
export function CategoryChip({ categoryId, size = 40 }: { categoryId: number; size?: 36 | 40 }) {
  const { icon: Icon, tone } = categoryById(categoryId)
  return (
    <span
      style={{ '--tone': tone, width: size, height: size } as CSSProperties}
      className="grid shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_15%,transparent)] text-(--tone)"
    >
      <Icon size={size === 36 ? 18 : 19} aria-hidden="true" />
    </span>
  )
}
