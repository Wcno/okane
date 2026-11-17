import type { Account } from '../../accounts/api'
import { MOVEMENT_TYPES, isMovementType, type MovementFilter, type MovementType } from '../../movements/api'
import { movementTypeFilterNames } from '../../movements/presentation'
import { INVESTMENT_TYPES, sameTypes } from '../../movements/views'
import { smallSecondaryButtonClassName } from '../buttons'
import { TextField } from '../TextField'
import { borderClassName, fieldClassName } from '../record/fieldStyles'
import { cardClassName } from '../screen/Screen'

export const PERIOD_REVERSED = 'El período no puede terminar antes de empezar.'

/** The choice that stands for all the investment types together. */
const INVESTMENTS = 'investments'

/** What the type select shows for the types chosen: one type, the investments or all. */
const typeChoice = (types: MovementType[]) =>
  types.length === 1 ? types[0] : sameTypes(types, INVESTMENT_TYPES) ? INVESTMENTS : ''

const typesOfChoice = (choice: string): MovementType[] =>
  choice === INVESTMENTS ? INVESTMENT_TYPES : isMovementType(choice) ? [choice] : []

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
  canClear,
  onChange,
  onClear,
}: {
  filter: MovementFilter
  accounts: Account[]
  /** Whether the filter differs from what the address starts with. */
  canClear: boolean
  onChange: (filter: MovementFilter) => void
  onClear: () => void
}) {
  const reversed = filter.from !== '' && filter.to !== '' && filter.from > filter.to

  return (
    <section aria-label="Filtros" className={`${cardClassName} mb-4 max-w-[44rem] lg:mb-5`}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
        <SelectField
          id="movement-type"
          label="Tipo"
          value={typeChoice(filter.types)}
          onChange={(value) => onChange({ ...filter, types: typesOfChoice(value) })}
        >
          <option value="">Todos los tipos</option>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {movementTypeFilterNames[type]}
            </option>
          ))}
          <option value={INVESTMENTS}>Compras, ventas y dividendos</option>
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
      {canClear && (
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
