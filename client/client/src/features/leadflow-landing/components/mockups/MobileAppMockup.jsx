import {
  Bell,
  CheckSquare,
  Home,
  MessageCircle,
  Phone,
  Signal,
  Users,
  Wifi,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const TASKS = [
  { id: 1, label: 'Call Rohan — pricing follow-up', time: '11:00', done: true },
  { id: 2, label: 'Send proposal to Meridian Labs', time: '13:30', done: false },
  { id: 3, label: 'Demo with Brightstone team', time: '16:00', done: false },
]

const TABS = [
  { icon: Home, label: 'Home', active: true },
  { icon: Users, label: 'Leads' },
  { icon: CheckSquare, label: 'Tasks' },
  { icon: MessageCircle, label: 'Chats' },
]

/** Phone shell — dark bezel, dynamic island, side buttons. */
export function PhoneFrame({ children, className }) {
  return (
    <div className={cn('relative w-[300px]', className)}>
      <span className="absolute -left-[2px] top-24 h-10 w-[3px] rounded-l bg-neutral-800" aria-hidden />
      <span className="absolute -left-[2px] top-36 h-14 w-[3px] rounded-l bg-neutral-800" aria-hidden />
      <span className="absolute -right-[2px] top-28 h-16 w-[3px] rounded-r bg-neutral-800" aria-hidden />
      <div className="relative aspect-[9/19] overflow-hidden rounded-[48px] border-[10px] border-ln-btn bg-white shadow-soft-lg">
        <span className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ln-btn" aria-hidden />
        {children}
      </div>
    </div>
  )
}

/** Coded mobile app screen — no store screenshots exist for this yet. */
export function MobileAppMockup({ className }) {
  return (
    <PhoneFrame className={className}>
      <div className="flex h-full flex-col bg-ln-bg2">
        <div className="flex items-center justify-between px-6 pb-2 pt-3.5 text-[11px] font-semibold text-ln-ink">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <Signal size={12} strokeWidth={1.75} />
            <Wifi size={12} strokeWidth={1.75} />
            <span className="h-2.5 w-5 rounded-sm border border-ln-ink">
              <span className="block h-full w-3/4 rounded-[1px] bg-ln-ink" />
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between px-5 pt-3">
          <div>
            <p className="text-[11px] text-ln-mut">Good morning</p>
            <p className="text-[15px] font-semibold text-ln-ink">Aman 👋</p>
          </div>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-ln-line bg-white">
            <Bell size={15} strokeWidth={1.75} className="text-ln-ink" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ln-accent" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 px-5">
          <div className="rounded-2xl border border-ln-line bg-white p-3.5">
            <p className="text-2xl font-semibold text-ln-ink">12</p>
            <p className="mt-0.5 text-[11px] text-ln-mut">New leads today</p>
          </div>
          <div className="rounded-2xl border border-ln-line bg-white p-3.5">
            <p className="text-2xl font-semibold text-ln-ink">5</p>
            <p className="mt-0.5 text-[11px] text-ln-mut">Tasks due</p>
          </div>
        </div>

        <div className="mt-4 flex-1 px-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ln-mut">Today</p>
          <div className="mt-2.5 space-y-2">
            {TASKS.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 rounded-2xl border border-ln-line bg-white px-3.5 py-3"
              >
                <span
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border',
                    task.done ? 'border-ln-accent bg-ln-accent' : 'border-neutral-300 bg-white',
                  )}
                >
                  {task.done ? (
                    <svg viewBox="0 0 10 8" className="h-2 w-2.5 fill-none stroke-white" strokeWidth="2">
                      <path d="M1 4l2.5 2.5L9 1" />
                    </svg>
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-[12px] font-medium',
                      task.done ? 'text-neutral-400 line-through' : 'text-ln-ink',
                    )}
                  >
                    {task.label}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-ln-mut">
                  <Phone size={10} strokeWidth={1.75} />
                  {task.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-ln-line bg-white px-6 pb-5 pt-3">
          <div className="flex items-center justify-between">
            {TABS.map(({ icon: Icon, label, active }) => (
              <span key={label} className="flex flex-col items-center gap-1">
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={active ? 'text-ln-ink' : 'text-neutral-400'}
                />
                <span
                  className={cn(
                    'text-[9px] font-medium',
                    active ? 'text-ln-ink' : 'text-neutral-400',
                  )}
                >
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
