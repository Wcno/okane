import {
  CarFront,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Shapes,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const initialIcons: Record<number, LucideIcon> = {
  1: House,
  2: Utensils,
  3: CarFront,
  4: Zap,
  5: HeartPulse,
  6: Clapperboard,
  7: GraduationCap,
  8: Shapes,
}

/** The icon of the initial Categories; every other one wears the generic tag. */
export const iconOf = (categoryId: number): LucideIcon => initialIcons[categoryId] ?? Tag

/**
 * The CSS variable of a Category's hue. `cat-1` to `cat-7` belong to the first
 * seven by identity (DESIGN.md, The Entity Keeps Its Hue Rule); any Category
 * beyond them, "Otros" included, uses the neutral `cat-0`.
 */
export const toneOf = (categoryId: number): string =>
  categoryId >= 1 && categoryId <= 7 ? `var(--cat-${categoryId})` : 'var(--cat-0)'
