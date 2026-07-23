import { Link } from 'react-router-dom'

/**
 * A "View all →" style nav link that can't be clicked (and doesn't invite a click) when the
 * target page needs a permission this user doesn't have.
 */
export function DisabledNavLink({ to, allowed, className, title = "You don't have permission to view this", children }) {
  if (!allowed) {
    return (
      <span className={`${className} cursor-not-allowed opacity-40`} title={title} aria-disabled="true">
        {children}
      </span>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}
