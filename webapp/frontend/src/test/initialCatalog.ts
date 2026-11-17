import type { Category } from '../categories/api'

/** The initial catalog as api-service seeds it, for tests that read names by id. */
export const initialCatalog: Category[] = [
  'Vivienda',
  'Alimentación',
  'Transporte',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Educación',
  'Otros',
].map((name, index) => ({ id: index + 1, name, isCustom: false, archivedAt: null }))
