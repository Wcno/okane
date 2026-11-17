import { Link } from 'react-router-dom'
import { NEEDS_AN_ACCOUNT } from '../../expenses/presentation'
import { primaryButtonClassName } from '../buttons'

/** What to say, and where to go, when no Account can take an Expense yet. */
export function NeedsAnAccount({ onLeave }: { onLeave?: () => void }) {
  return (
    <>
      <p className="text-ink-2">{NEEDS_AN_ACCOUNT}</p>
      <Link to="/accounts/create" onClick={onLeave} className={`${primaryButtonClassName} mt-4`}>
        Crear cuenta
      </Link>
    </>
  )
}
