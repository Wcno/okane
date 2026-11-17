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
  /** The id api-service gives the fixed Category (1 to 8); it never changes. */
  id: number
  name: string
  icon: LucideIcon
  /** CSS variable for this Category color; the color follows its identity, not its list position. */
  tone: string
}

// Preserve the validated color blindness palette order.
export const categories: Category[] = [
  { id: 1, name: 'Vivienda', icon: House, tone: 'var(--cat-1)' },
  { id: 2, name: 'Alimentación', icon: Utensils, tone: 'var(--cat-2)' },
  { id: 3, name: 'Transporte', icon: CarFront, tone: 'var(--cat-3)' },
  { id: 4, name: 'Servicios', icon: Zap, tone: 'var(--cat-4)' },
  { id: 5, name: 'Salud', icon: HeartPulse, tone: 'var(--cat-5)' },
  { id: 6, name: 'Entretenimiento', icon: Clapperboard, tone: 'var(--cat-6)' },
  { id: 7, name: 'Educación', icon: GraduationCap, tone: 'var(--cat-7)' },
  { id: 8, name: 'Otros', icon: Shapes, tone: 'var(--cat-0)' },
]

export const categoryById = (id: number): Category =>
  categories.find((category) => category.id === id) ?? categories[categories.length - 1]

export const categoryByName = (name: string): Category =>
  categories.find((category) => category.name === name) ?? categories[categories.length - 1]
