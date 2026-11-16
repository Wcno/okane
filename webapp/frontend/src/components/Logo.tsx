import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-2.5 rounded-lg" aria-label="Okane, ir al Panel">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <circle cx="16" cy="16" r="7.5" fill="none" strokeWidth="3" className="stroke-on-primary" />
        <path d="M16 8.5a7.5 7.5 0 0 1 7.5 7.5H16z" className="fill-on-primary" />
      </svg>
      <span className="text-[1.2rem] font-semibold tracking-[-0.02em]">Okane</span>
    </Link>
  )
}
