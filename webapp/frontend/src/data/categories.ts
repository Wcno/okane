import {
  CarFront,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Shapes,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface Category {
  name: string
  icon: LucideIcon
  /** CSS variable for this Category color; the color follows its identity, not its list position. */
  tone: string
}

// Preserve the validated color blindness palette order.
export const categories: Category[] = [
  { name: 'Vivienda', icon: House, tone: 'var(--cat-1)' },
  { name: 'Alimentación', icon: Utensils, tone: 'var(--cat-2)' },
  { name: 'Transporte', icon: CarFront, tone: 'var(--cat-3)' },
  { name: 'Servicios', icon: Zap, tone: 'var(--cat-4)' },
  { name: 'Salud', icon: HeartPulse, tone: 'var(--cat-5)' },
  { name: 'Entretenimiento', icon: Clapperboard, tone: 'var(--cat-6)' },
  { name: 'Educación', icon: GraduationCap, tone: 'var(--cat-7)' },
  { name: 'Otros', icon: Shapes, tone: 'var(--cat-0)' },
]

export const categoryByName = (name: string): Category =>
  categories.find((category) => category.name === name) ?? categories[categories.length - 1]
