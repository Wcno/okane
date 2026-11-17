import type { Account } from '../../accounts/api'
import { MOVEMENT_TYPES, isMovementType, type MovementFilter } from '../../movements/api'
import { movementTypeFilterNames } from '../../movements/presentation'
import { smallSecondaryButtonClassName } from '../buttons'
import { SelectField } from '../SelectField'
import { TextField } from '../TextField'
import { cardClassName } from '../screen/Screen'

export const PERIOD_REVERSED = 'El período no puede terminar antes de empezar.'

export const isEmptyFilter = (filter: MovementFilter) =>
  filter.type === null && filter.accountId === null && filter.from === '' && filter.to === ''

/** The filters of the Movements view: type, Account and an inclusive period. */
export function MovementFilters({
  filter,
  accounts,
  onChange,
  onClear,
}: {
  filter: MovementFilter
  accounts: Account[]
  onChange: (filter: MovementFilter) => void
  /** Set when the address carries filters; going back leaves the User's preferences. */
  onClear?: () => void
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
      {onClear && (
        <button
          type="button"
          className={`${smallSecondaryButtonClassName} mt-4`}
          onClick={onClear}
        >
          Quitar filtros
        </button>
      )}
    </section>
  )
}
