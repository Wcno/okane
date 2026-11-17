import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * The way from the edit screen of a record to its delete screen: a quiet link
 * at the foot of the card, so a list row never carries a delete action.
 */
export function DeleteLink({ to, children }: { to: string; children: string }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Link
        to={to}
        className="-ml-3 inline-flex h-[44px] items-center gap-2 rounded-full px-3 text-[0.95rem] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <Trash2 size={17} aria-hidden="true" />
        {children}
      </Link>
    </div>
  )
}
