import { CircleAlert, LogOut } from 'lucide-react'
import { useSignOut } from '../auth/useSignOut'

/**
 * Signs out in one click from inside the app. `className` styles the button for
 * where it sits: a sidebar row on a PC, a Menú row on a phone.
 */
export function SignOutButton({ className, iconSize }: { className: string; iconSize: number }) {
  const { progress, signOutNow } = useSignOut()
  const isClosing = progress.status === 'closing'

  return (
    <div>
      <button type="button" onClick={signOutNow} disabled={isClosing} aria-busy={isClosing} className={className}>
        <LogOut size={iconSize} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        {isClosing ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {progress.status === 'failed' && (
        <p role="alert" className="flex items-start gap-2 px-2 pt-1.5 text-[0.87rem] text-ink">
          <CircleAlert size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden="true" />
          {progress.message}
        </p>
      )}
    </div>
  )
}
