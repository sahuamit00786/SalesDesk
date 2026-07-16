import React from 'react'
import { ChevronRight } from '@/components/ui/icons'
import { Link } from 'react-router-dom'

export function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-ink-muted mb-4">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
          {item.href && i < items.length - 1 ? (
            <Link to={item.href} className="hover:text-ink transition-colors">{item.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? 'text-ink font-medium' : ''}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
