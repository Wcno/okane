import type { Account } from '../../accounts/api'
import { MOVEMENT_TYPES, isMovementType, type MovementFilter } from '../../movements/api'
import { movementTypeFilterNames } from '../../movements/presentation'
import { smallSecondaryButtonClassName } from '../buttons'
import { TextField } from '../TextField'
import { borderClassName, fieldClassName } from '../record/RecordFields'
import { cardClassName } from '../screen/Screen'

export const PERIOD_REVERSED = 'El período no puede terminar antes de empezar.'

export const isEmptyFilter = (filter: MovementFilter) =>
  filter.type === null && filter.accountId === null && filter.from === '' && filter.to === ''

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="col-span-2 sm:col-span-1">
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClassName} ${borderClassName(false)} mt-1.5`}
      >
        {children}
      </select>
    </div>
  )
}

/** The filters of the Movements view: type, Account and an inclusive period. */
export function MovementFilters({
  filter,
  accounts,
  onChange,
}: {
  filter: MovementFilter
  accounts: Account[]
  onChange: (filter: MovementFilter) => void
}) {
  const reversed = filter.from !== '' && filter.to !== '' && filter.from > filter.to

  return (
    <section aria-label="Filtros" className={`${cardClassName} mb-4 max-w-[44rem] lg:mb-5`}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
        <SelectField
          id="movement-type"
          label="Tipo"
          value={filter.type ?? ''}
          onChange={(value) => onChange({ ...filter, type: isMovementType(value) ? value : null })}
        >
          <option value="">Todos los tipos</option>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {movementTypeFilterNames[type]}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="movement-account"
          label="Cuenta"
          value={filter.accountId === null ? '' : String(filter.accountId)}
          onChange={(value) => onChange({ ...filter, accountId: value === '' ? null : Number(value) })}
        >
          <option value="">Todas las Cuentas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
              {account.archivedAt === null ? '' : ' (archivada)'}
            </option>
          ))}
        </SelectField>
        <TextField
          id="movement-from"
          label="Desde"
          type="date"
          value={filter.from}
          onChange={(event) => onChange({ ...filter, from: event.target.value })}
        />
        <TextField
          id="movement-to"
          label="Hasta"
          type="date"
          value={filter.to}
          errors={reversed ? [PERIOD_REVERSED] : undefined}
          onChange={(event) => onChange({ ...filter, to: event.target.value })}
        />
      </div>
      {!isEmptyFilter(filter) && (
        <button
          type="button"
          className={`${smallSecondaryButtonClassName} mt-4`}
          onClick={() => onChange({ type: null, accountId: null, from: '', to: '' })}
        >
          Quitar filtros
        </button>
      )}
    </section>
  )
}
