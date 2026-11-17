import { lastDayOfMonth } from '../lib/dates'
import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'
import { monthOf } from '../lib/months'
import { isMovementType, type MovementFilter, type MovementType } from '../movements/api'

export type Period = 'current_month' | 'all' | 'custom'
export type Grouping = 'date' | 'type'

/** What the Panel can show, in display order; the ids are the ones webapp stores. */
export const DASHBOARD_SECTIONS = ['available', 'budgets', 'net_worth', 'upcoming', 'accounts'] as const
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number]

/** The User's preferences for Movements and the Panel. */
export interface Preferences {
  movementType: MovementType | null
  accountId: number | null
  period: Period
  /** The days of a custom period; empty for any other. */
  from: string
  to: string
  grouping: Grouping
  visibleSections: DashboardSection[]
}

export type PreferenceField = 'movementType' | 'accountId' | 'period' | 'from' | 'to' | 'grouping' | 'visibleSections'
export type PreferenceErrors = FieldErrors<PreferenceField>

export const INITIAL_PREFERENCES: Preferences = {
  movementType: null,
  accountId: null,
  period: 'current_month',
  from: '',
  to: '',
  grouping: 'date',
  visibleSections: [...DASHBOARD_SECTIONS],
}

interface PreferencesBody {
  movement_type: string | null
  account_id: number | null
  period: Period
  from: string | null
  to: string | null
  grouping: Grouping
  visible_sections: DashboardSection[]
}

const LOAD_FAILED = 'Okane no pudo consultar tus preferencias. Espera un momento e inténtalo de nuevo.'
const SAVE_UNAVAILABLE = 'Okane no pudo comprobar tu Cuenta ahora. Espera un momento e inténtalo de nuevo.'

const FORM_FIELDS: Record<string, PreferenceField> = {
  movement_type: 'movementType',
  account_id: 'accountId',
  period: 'period',
  from: 'from',
  to: 'to',
  grouping: 'grouping',
  visible_sections: 'visibleSections',
}

const toPreferences = (body: PreferencesBody): Preferences => ({
  movementType: isMovementType(body.movement_type) ? body.movement_type : null,
  accountId: body.account_id,
  period: body.period,
  from: body.from ?? '',
  to: body.to ?? '',
  grouping: body.grouping,
  visibleSections: body.visible_sections,
})

const toBody = (preferences: Preferences) => ({
  movement_type: preferences.movementType,
  account_id: preferences.accountId,
  period: preferences.period,
  from: preferences.period === 'custom' && preferences.from !== '' ? preferences.from : null,
  to: preferences.period === 'custom' && preferences.to !== '' ? preferences.to : null,
  grouping: preferences.grouping,
  visible_sections: preferences.visibleSections,
})

export async function getPreferences(): Promise<Preferences> {
  return toPreferences(await readJson<PreferencesBody>('/api/settings/preferences', { failed: LOAD_FAILED }))
}

export function savePreferences(
  preferences: Preferences,
  csrfToken: string,
): Promise<Outcome<Preferences, PreferenceField>> {
  return write({
    method: 'PUT',
    path: '/api/settings/preferences',
    csrfToken,
    body: toBody(preferences),
    fields: FORM_FIELDS,
    unavailable: SAVE_UNAVAILABLE,
    read: async (response) => toPreferences(await response.json()),
  })
}

/** The Movements filter the preferences ask for on `today`; the current month is relative to it. */
export function movementFilterOf(preferences: Preferences, today: string): MovementFilter {
  const month = monthOf(today)
  const period =
    preferences.period === 'current_month'
      ? { from: `${month}-01`, to: lastDayOfMonth(month) }
      : preferences.period === 'custom'
        ? { from: preferences.from, to: preferences.to }
        : { from: '', to: '' }
  return { types: preferences.movementType === null ? [] : [preferences.movementType], accountId: preferences.accountId, ...period }
}
