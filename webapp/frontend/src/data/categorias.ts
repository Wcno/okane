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

export interface Categoria {
  nombre: string
  icono: LucideIcon
  /** Variable CSS con el tono de la Categoría. El tono sigue a la Categoría, no a su posición. */
  tono: string
}

// El orden de los tonos es el del conjunto validado para daltonismo; no se reordena.
export const categorias: Categoria[] = [
  { nombre: 'Vivienda', icono: House, tono: 'var(--cat-1)' },
  { nombre: 'Alimentación', icono: Utensils, tono: 'var(--cat-2)' },
  { nombre: 'Transporte', icono: CarFront, tono: 'var(--cat-3)' },
  { nombre: 'Servicios', icono: Zap, tono: 'var(--cat-4)' },
  { nombre: 'Salud', icono: HeartPulse, tono: 'var(--cat-5)' },
  { nombre: 'Entretenimiento', icono: Clapperboard, tono: 'var(--cat-6)' },
  { nombre: 'Educación', icono: GraduationCap, tono: 'var(--cat-7)' },
  { nombre: 'Otros', icono: Shapes, tono: 'var(--cat-0)' },
]

export const categoriaPorNombre = (nombre: string): Categoria =>
  categorias.find((categoria) => categoria.nombre === nombre) ?? categorias[categorias.length - 1]
