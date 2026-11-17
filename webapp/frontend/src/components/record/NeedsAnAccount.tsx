import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { primaryButtonClassName } from '../buttons'
import { cardClassName } from '../screen/Screen'

/** Why a form that registers money asks for an Account first, and the way to create one. */
export function NeedsAnAccount({ text, onLeave }: { text: string; onLeave?: () => void }) {
  return (
    <>
      <p className="text-ink-2">{text}</p>
      <Link to="/accounts/create" onClick={onLeave} className={`${primaryButtonClassName} mt-4`}>
        Crear cuenta
      </Link>
    </>
  )
}

/** The card a full screen shows instead of its form while the User has no Account that can take the record. */
export function NeedsAnAccountCard({ text }: { text: string }) {
  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <Wallet size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 mb-2 text-[1.2rem] font-semibold tracking-[-0.01em]">Primero necesitas una Cuenta</h2>
      <NeedsAnAccount text={text} />
    </section>
  )
}
