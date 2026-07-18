/**
 * Semantic icon tones.
 *
 * Icons carry meaning, so they get a colour tied to that meaning rather than to
 * the page they sit on: a Trash2 is red in a table row, in a modal, and in a
 * drawer. Chrome (chevrons, X, Search) and editor-toolbar icons stay neutral —
 * they are structure, not signal, and colouring them turns a screen into noise.
 *
 * Consumers import icons from `@/components/ui/icons`, which tags each icon with
 * its `icon-tone-*` class. Those classes are defined in index.css inside
 * `:where()`, so they carry ZERO specificity — any explicit `text-*` on the icon,
 * and any `cx-icon-inherit` surface, overrides the tone without !important.
 * That is what keeps this safe to apply app-wide.
 */

/** tone key → class name. Colours live in index.css (zero-specificity rules). */
export const TONE_CLASS = {
  people: 'icon-tone-people',
  money: 'icon-tone-money',
  mail: 'icon-tone-mail',
  call: 'icon-tone-call',
  time: 'icon-tone-time',
  doc: 'icon-tone-doc',
  ai: 'icon-tone-ai',
  analytics: 'icon-tone-analytics',
  campaign: 'icon-tone-campaign',
  automation: 'icon-tone-automation',
  success: 'icon-tone-success',
  warning: 'icon-tone-warning',
  danger: 'icon-tone-danger',
  edit: 'icon-tone-edit',
  security: 'icon-tone-security',
  media: 'icon-tone-media',
  place: 'icon-tone-place',
  hr: 'icon-tone-hr',
}

const GROUPS = {
  people: [
    'Users', 'UsersRound', 'User', 'UserRound', 'UserPlus', 'UserCircle', 'UserCircle2',
    'UserCog', 'UserMinus', 'IdCard', 'HeartHandshake', 'GraduationCap', 'Building',
    'Building2', 'Briefcase', 'BriefcaseBusiness',
  ],
  money: [
    'DollarSign', 'CircleDollarSign', 'BadgeDollarSign', 'BadgeIndianRupee', 'Banknote',
    'Receipt', 'ReceiptText', 'CreditCard', 'Wallet', 'Landmark', 'Percent', 'Scale',
    'Bitcoin', 'ShoppingBag', 'ShoppingCart', 'Truck',
  ],
  mail: [
    'Mail', 'MailOpen', 'Send', 'Inbox', 'Reply', 'ReplyAll', 'Forward', 'AtSign',
    'MessageCircle', 'MessageSquare', 'MessageSquarePlus', 'CornerUpLeft',
  ],
  call: ['Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'Video', 'Mic', 'Signal', 'Smartphone', 'Wifi'],
  time: [
    'Calendar', 'CalendarDays', 'CalendarClock', 'Clock', 'Clock3',
    'History', 'Repeat', 'Hourglass', 'Timer',
  ],
  doc: [
    'FileText', 'File', 'FileStack', 'FileSpreadsheet', 'FileImage', 'FileArchive',
    'FileInput', 'ClipboardList', 'ScrollText', 'StickyNote', 'NotebookPen', 'Folder',
    'FolderOpen', 'FolderInput', 'Printer', 'Presentation', 'BookOpen',
    'Bookmark', 'Layers', 'LayoutTemplate', 'Paperclip', 'Copy', 'Save', 'Archive',
    'ArchiveRestore', 'Database', 'HardDrive',
  ],
  ai: ['Sparkles', 'Cpu', 'Rocket'],
  analytics: [
    'BarChart2', 'BarChart3', 'LineChart', 'Activity', 'TrendingUp', 'Gauge',
    'Kanban', 'SquareKanban', 'LayoutGrid', 'Home',
  ],
  campaign: ['Megaphone', 'Target', 'MousePointerClick', 'Globe', 'Globe2'],
  automation: [
    'Workflow', 'Zap', 'GitBranch', 'GitMerge', 'Shuffle', 'ArrowLeftRight', 'FormInput',
    'Puzzle', 'Hammer', 'Waypoints', 'Route',
  ],
  success: [
    'Check', 'CheckCircle', 'CheckCircle2', 'CheckSquare', 'CheckSquare2', 'BadgeCheck',
    'ShieldCheck', 'ClipboardCheck', 'MailCheck', 'UserCheck', 'UserRoundCheck',
    'ListChecks', 'BookmarkCheck', 'CalendarCheck', 'CalendarCheck2', 'Trophy',
    'PartyPopper', 'Plus', 'FolderPlus', 'CalendarPlus', 'ImagePlus', 'Play', 'PlayCircle',
  ],
  warning: ['AlertTriangle', 'AlertCircle', 'Flag', 'Star', 'Award', 'Bell', 'BellRing', 'Pause'],
  danger: ['Trash2', 'XCircle', 'UserX', 'PhoneMissed', 'ThumbsDown', 'TrendingDown', 'Unlink2', 'LogOut'],
  edit: ['Pencil', 'PenLine', 'PencilLine'],
  security: ['Lock', 'KeyRound', 'Shield', 'Eye', 'EyeOff'],
  media: ['Image', 'Camera', 'Music', 'ScanLine', 'Tag', 'Heart'],
  place: ['Map', 'MapPin', 'Compass'],
  hr: ['Umbrella', 'Palmtree', 'ListTodo', 'ListTree'],
}

/** icon name → tone key. Names absent from this map render with inherited colour. */
export const ICON_TONE = Object.freeze(
  Object.entries(GROUPS).reduce((acc, [tone, names]) => {
    for (const name of names) acc[name] = tone
    return acc
  }, {}),
)

export function toneClassFor(name) {
  return TONE_CLASS[ICON_TONE[name]] || ''
}
