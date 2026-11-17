import { DASHBOARD_SECTIONS, type DashboardSection } from './api'

export { DASHBOARD_SECTIONS }

/** What the settings list calls each section of the Panel. */
export const dashboardSectionNames: Record<DashboardSection, string> = {
  available: 'Disponible hasta fin de mes',
  budgets: 'Restante por Categoría',
  net_worth: 'Patrimonio',
  upcoming: 'Comprometido',
  accounts: 'Cuentas',
}
