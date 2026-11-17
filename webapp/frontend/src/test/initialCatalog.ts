import type { Category } from '../categories/api'

/** The initial catalog as a User gets it, for tests that read names by id (ids here are arbitrary). */
export const initialCatalog: Category[] = [
  ['housing', 'Vivienda'],
  ['food', 'Alimentación'],
  ['transport', 'Transporte'],
  ['utilities', 'Servicios'],
  ['health', 'Salud'],
  ['entertainment', 'Entretenimiento'],
  ['education', 'Educación'],
  ['other', 'Otros'],
].map(([key, name], index) => ({ id: index + 1, name, key, hasRecords: false, archivedAt: null }))
