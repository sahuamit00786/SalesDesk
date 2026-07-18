import { cn } from '@/utils/cn'
import { getAvatarColor } from '@/utils/avatarColor'
import { getInitials } from '@/features/gmail/gmailParserUtils'

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-9 w-9 text-xs',
}

export default function GmailAvatar({ name, email, size = 'md', className }) {
  const initials = getInitials(name && name !== 'Unknown' ? name : email)
  const { bg, text } = getAvatarColor(email || name || '')
  return (
    <div
      aria-hidden
      style={{ backgroundColor: bg, color: text }}
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', SIZES[size], className)}
    >
      {initials || '??'}
    </div>
  )
}
