import { useNavigate } from 'react-router-dom'
import { Briefcase, ExternalLink, Megaphone, User, Users } from 'lucide-react'
import { cn } from '@/utils/cn'

const ENTITY_ROUTES = {
  lead: (id) => `/leads/${id}`,
  deal: (id) => `/deals/${id}`,
  user: (id) => `/team/${id}`,
  campaign: (id) => `/campaigns/${id}`,
}

const ENTITY_ICONS = {
  lead: Users,
  deal: Briefcase,
  user: User,
  campaign: Megaphone,
}

export function EntityLinksBlock({ block }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap gap-1.5">
      {block.items.map((item) => {
        const toPath = ENTITY_ROUTES[item.kind]?.(item.id)
        if (!toPath) return null
        const Icon = ENTITY_ICONS[item.kind] || ExternalLink
        return (
          <button
            key={`${item.kind}:${item.id}`}
            type="button"
            onClick={() => navigate(toPath)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white px-2.5 py-1 text-xs font-medium text-ink',
              'transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            <Icon className="h-3 w-3" />
            {item.label}
            <ExternalLink className="h-3 w-3 text-ink-faint" />
          </button>
        )
      })}
    </div>
  )
}
