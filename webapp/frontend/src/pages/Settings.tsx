import { useState } from 'react'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { useSignedInUser } from '../auth/context'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { PERIOD_REVERSED } from '../components/movements/MovementFilters'
import { RecordEditor } from '../components/record/RecordEditor'
import { NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { useRecordForm, type Validated } from '../lib/useRecordForm'
import { MOVEMENT_TYPES, isMovementType } from '../movements/api'
import { movementTypeFilterNames } from '../movements/presentation'
import {
  savePreferences,
  type Grouping,
  type PreferenceErrors,
  type PreferenceField,
  type Period,
  type Preferences,
} from '../preferences/api'
import { dashboardSectionNames, DASHBOARD_SECTIONS } from '../preferences/presentation'
import { usePreferences } from '../preferences/usePreferences'

const CUSTOM_PERIOD_EMPTY = 'Escribe desde cuándo, hasta cuándo, o ambas fechas.'

function validate(draft: Preferences): Validated<Preferences, PreferenceField> {
  const errors: PreferenceErrors = {}
  if (draft.period === 'custom') {
    if (draft.from === '' && draft.to === '') errors.period = [CUSTOM_PERIOD_EMPTY]
    else if (draft.from !== '' && draft.to !== '' && draft.from > draft.to) errors.to = [PERIOD_REVERSED]
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: draft }
}

function SectionsField({
  visible,
  onChange,
}: {
  visible: Preferences['visibleSections']
  onChange: (sections: Preferences['visibleSections']) => void
}) {
  return (
    <fieldset>
      <legend className="text-[0.9rem] font-medium text-ink-2">Secciones visibles del Panel</legend>
      <p className="mt-1 text-[0.87rem] text-ink-3">
        Ocultar una sección no cambia tus cifras ni tus advertencias, solo lo que ves en el Panel.
      </p>
      <div className="mt-2 space-y-1">
        {DASHBOARD_SECTIONS.map((section) => {
          const id = `settings-section-${section}`
          return (
            <label key={section} htmlFor={id} className="flex min-h-[44px] items-center gap-3 text-[1rem]">
              <input
                id={id}
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={visible.includes(section)}
                onChange={(event) =>
                  onChange(
                    DASHBOARD_SECTIONS.filter((name) =>
                      name === section ? event.target.checked : visible.includes(name),
                    ),
                  )
                }
              />
              {dashboardSectionNames[section]}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function PreferencesEditor({
  initial,
  accounts,
  onSaved,
}: {
  initial: Preferences
  accounts: Account[]
  onSaved: () => void
}) {
  const { csrfToken } = useSignedInUser()
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm<
    Preferences,
    PreferenceField,
    Preferences,
    Preferences
  >({
    initial,
    validate,
    save: (preferences) => savePreferences(preferences, csrfToken),
    onSaved,
  })

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel="Guardar preferencias"
      submittingLabel="Guardando…"
      cancelTo="/dashboard"
      fields={
        <>
          <h2 className="text-[1.1rem] font-semibold">Movimientos</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
            <SelectField
              id="settings-type"
              label="Tipo"
              value={draft.movementType ?? ''}
              errors={errors.movementType}
              onChange={(value) => change({ movementType: isMovementType(value) ? value : null })}
            >
              <option value="">Todos los tipos</option>
              {MOVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {movementTypeFilterNames[type]}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="settings-account"
              label="Cuenta"
              value={draft.accountId === null ? '' : String(draft.accountId)}
              errors={errors.accountId}
              onChange={(value) => change({ accountId: value === '' ? null : Number(value) })}
            >
              <option value="">Todas las Cuentas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.archivedAt === null ? '' : ' (archivada)'}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="settings-period"
              label="Período"
              value={draft.period}
              errors={errors.period}
              onChange={(value) => change({ period: value as Period })}
            >
              <option value="current_month">Mes actual</option>
              <option value="all">Todo el tiempo</option>
              <option value="custom">Fechas elegidas</option>
            </SelectField>
            <SelectField
              id="settings-grouping"
              label="Agrupar por"
              value={draft.grouping}
              errors={errors.grouping}
              onChange={(value) => change({ grouping: value as Grouping })}
            >
              <option value="date">Fecha</option>
              <option value="type">Tipo</option>
            </SelectField>
            {draft.period === 'custom' && (
              <>
                <TextField
                  id="settings-from"
                  label="Desde"
                  type="date"
                  value={draft.from}
                  errors={errors.from}
                  onChange={(event) => change({ from: event.target.value })}
                />
                <TextField
                  id="settings-to"
                  label="Hasta"
                  type="date"
                  value={draft.to}
                  errors={errors.to}
                  onChange={(event) => change({ to: event.target.value })}
                />
              </>
            )}
          </div>
          <h2 className="pt-2 text-[1.1rem] font-semibold">Panel</h2>
          <SectionsField visible={draft.visibleSections} onChange={(visibleSections) => change({ visibleSections })} />
          {errors.visibleSections && (
            <p className="text-[0.9rem] text-critical">{errors.visibleSections.join(' ')}</p>
          )}
        </>
      }
    />
  )
}

/** Preferences: what Movements opens with and which sections of the Panel show. */
export function Settings() {
  const preferences = usePreferences()
  const accounts = useAccounts()
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const loading = preferences.state.status !== 'ready' ? preferences : accounts.state.status !== 'ready' ? accounts : null

  return (
    <>
      <ScreenHeader
        title="Preferencias"
        intro="Elige con qué filtros se abren tus Movimientos y qué secciones muestra tu Panel. No cambian tus cifras."
      />
      <NoticeBanner notice={savedNotice} className="max-w-[34rem]" />
      {loading !== null && loading.state.status !== 'ready' ? (
        <Pending state={loading.state} retry={loading.retry} loading="Cargando tus preferencias…" />
      ) : preferences.state.status === 'ready' && accounts.state.status === 'ready' ? (
        <PreferencesEditor
          initial={preferences.state.value}
          accounts={accounts.state.value}
          onSaved={() => setSavedNotice('Preferencias guardadas.')}
        />
      ) : null}
    </>
  )
}
